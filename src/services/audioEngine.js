// Enterprise Unified Audio Controller for Melo (Ad-Free YouTube Master Streams + Web Audio Equalizer + Offline Playback + MediaSession)
import { SAMPLE_TRACKS, DEFAULT_FALLBACK_COVER } from '../data/samples.js';
import { Storage } from './storage.js';
import { LyricsEngine } from './lyricsService.js';
import { musicSearchService } from './musicSearchService.js';
import { getTrackArtworkUrl } from './artworkService.js';

export function isDeviceTrack(track) {
  if (!track) return false;
  return (
    track.source === 'device' ||
    track.isDeviceTrack === true ||
    track.isDeviceMusic === true ||
    (typeof track.id === 'string' && track.id.startsWith('device-')) ||
    (typeof track.contentUri === 'string' && track.contentUri.length > 0) ||
    (track.blob instanceof Blob)
  );
}

const checkIsDeviceTrack = isDeviceTrack;

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    // Dedicated background audio keep-alive for Android native lockscreen playback
    this.bgAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    this.bgAudio.loop = true;
    this.bgAudio.volume = 0.001;

    // Playback modes: 'yt' (ad-free YouTube master audio), 'html5' (offline blob), or 'native' (Android MediaStore)
    this.currentMode = 'yt';

    // Strictly Isolated Playback Modes: 'youtube' | 'device'
    this.activeSource = 'youtube';
    this.sourceStates = {
      youtube: {
        queue: [...SAMPLE_TRACKS],
        originalQueue: [...SAMPLE_TRACKS],
        queueIndex: 0,
        isShuffle: false,
        repeatMode: 'all',
        history: [],
        shuffleOrder: [],
        shuffleIndex: 0,
        currentTrack: null,
        currentTime: 0,
        duration: 0
      },
      device: {
        queue: [],
        originalQueue: [],
        queueIndex: 0,
        isShuffle: false,
        repeatMode: 'all',
        history: [],
        shuffleOrder: [],
        shuffleIndex: 0,
        currentTrack: null,
        currentTime: 0,
        duration: 0
      }
    };

    // YouTube IFrame Player instance
    this.ytPlayer = null;
    this.ytReady = false;
    this.ytProgressInterval = null;
    this.nativeProgressInterval = null;

    this.currentTrack = null;
    this.isPlaying = false;
    this.isLoadingTrack = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 0.85;
    this.isMuted = false;
    this.userRequestedPause = false;

    // Web Audio API Equalizer Nodes
    this.audioContext = null;
    this.sourceNode = null;
    this.eqFilters = [];
    this.currentEqPreset = 'bass';

    // Modes
    this.isShuffle = false;
    this.repeatMode = 'all'; // 'off' | 'all' | 'one'

    // Queues & History
    this.queue = [...SAMPLE_TRACKS];
    this.queueIndex = 0;
    this.history = []; // rolling list of played track titles/IDs to prevent repetition
    this.isReplenishingQueue = false;
    this.pendingResumeTime = 0;
    this.lastSessionSave = 0;

    // Lyrics
    this.lyricsEngine = new LyricsEngine();

    // Event subscribers
    this.listeners = {
      trackChange: [],
      timeUpdate: [],
      playStateChange: [],
      queueChange: [],
      lyricsUpdate: [],
      loadingChange: []
    };

    this.initAudioListeners();
    this.initYouTubePlayer();
    this.initVisibilityListener();
    this.initNativeBridgeListeners();
  }

  initNativeBridgeListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('native-media-action', (e) => {
        const action = e.detail?.action;
        if (action === 'toggle') {
          this.togglePlay();
        } else if (action === 'play') {
          this.play();
        } else if (action === 'pause') {
          this.pause();
        } else if (action === 'next') {
          this.next();
        } else if (action === 'previous') {
          this.prev();
        } else if (action === 'seek' && typeof e.detail?.position === 'number') {
          this.seek(e.detail.position);
        }
      });

      window.addEventListener('native-playback-sync', (e) => {
        const detail = e.detail || {};
        if (this.activeSource === 'device') {
          if (detail.action === 'play' || detail.action === 'playing') {
            this.isPlaying = true;
            this.notify('playStateChange', { isPlaying: true });
            this.startNativeProgressTracker();
          } else if (detail.action === 'pause') {
            this.isPlaying = false;
            this.notify('playStateChange', { isPlaying: false });
            this.stopNativeProgressTracker();
          } else if (detail.action === 'seeked' && typeof detail.position === 'number') {
            this.currentTime = detail.position;
            this.notify('timeUpdate', {
              currentTime: this.currentTime,
              duration: this.duration,
              progress: this.duration > 0 ? this.currentTime / this.duration : 0
            });
          } else if (detail.action === 'trackChange') {
            this.syncFromNativeService();
          }
        }
      });

      window.addEventListener('beforeunload', () => this.savePlaybackSessionState());
      window.addEventListener('pagehide', () => this.savePlaybackSessionState());

      // Reconnect to active native background session on startup/resume
      setTimeout(() => this.reconnectNativeSession(), 200);
    }
  }

  reconnectNativeSession() {
    if (typeof window === 'undefined' || !window.AndroidMusicBridge) return false;
    try {
      if (typeof window.AndroidMusicBridge.getNativePlaybackState === 'function') {
        const raw = window.AndroidMusicBridge.getNativePlaybackState();
        if (raw && raw !== '{}') {
          const state = JSON.parse(raw);
          if (state && state.activeSource === 'device' && state.currentTrack && state.currentTrack.id) {
            this.activeSource = 'device';
            this.currentMode = 'native';
            if (Array.isArray(state.queue) && state.queue.length > 0) {
              this.queue = state.queue;
              this.queueIndex = typeof state.queueIndex === 'number' ? state.queueIndex : 0;
              this.sourceStates.device.queue = [...this.queue];
              this.sourceStates.device.originalQueue = [...this.queue];
              this.sourceStates.device.queueIndex = this.queueIndex;
            }
            if (typeof state.isShuffle === 'boolean') {
              this.isShuffle = state.isShuffle;
              this.sourceStates.device.isShuffle = this.isShuffle;
            }
            if (state.repeatMode) {
              this.repeatMode = state.repeatMode;
              this.sourceStates.device.repeatMode = this.repeatMode;
            }
            this.currentTrack = state.currentTrack;
            this.currentTime = state.currentTime || 0;
            this.duration = state.duration || state.currentTrack.duration || 0;
            this.isPlaying = !!state.isPlaying;

            this.updateMediaSessionMetadata();
            this.updateMediaSessionPlaybackState(this.isPlaying ? 'playing' : 'paused');

            this.notify('trackChange', this.currentTrack);
            this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
            this.notify('timeUpdate', {
              currentTime: this.currentTime,
              duration: this.duration,
              progress: this.duration > 0 ? this.currentTime / this.duration : 0
            });
            this.notify('playStateChange', { isPlaying: this.isPlaying });

            if (this.isPlaying) {
              this.startNativeProgressTracker();
            }
            return true;
          }
        }
      }
    } catch (e) {
      console.warn('Native session reconnection fallback:', e);
    }
    return false;
  }

  startNativeProgressTracker() {
    this.stopNativeProgressTracker();
    this.nativeProgressInterval = setInterval(() => {
      if (this.activeSource !== 'device' || !this.isPlaying) return;
      if (typeof window !== 'undefined' && window.AndroidMusicBridge?.getNativePlaybackState) {
        try {
          const raw = window.AndroidMusicBridge.getNativePlaybackState();
          if (raw && raw !== '{}') {
            const state = JSON.parse(raw);
            if (typeof state.currentTime === 'number') {
              this.currentTime = state.currentTime;
              if (state.duration > 0) this.duration = state.duration;
              const cur = this.currentTime;
              const dur = this.duration || this.currentTrack?.duration || 0;
              const prog = dur > 0 ? cur / dur : 0;
              this.notify('timeUpdate', {
                currentTime: cur,
                duration: dur,
                progress: prog
              });
              if ('mediaSession' in navigator && dur > 0) {
                try {
                  navigator.mediaSession.setPositionState({
                    duration: dur,
                    playbackRate: 1,
                    position: cur
                  });
                } catch (e) {}
              }
            }
          }
        } catch (e) {}
      }
    }, 250);
  }

  stopNativeProgressTracker() {
    if (this.nativeProgressInterval) {
      clearInterval(this.nativeProgressInterval);
      this.nativeProgressInterval = null;
    }
  }

  syncFromNativeService() {
    if (typeof window === 'undefined' || !window.AndroidMusicBridge) return;
    try {
      if (typeof window.AndroidMusicBridge.getNativePlaybackState === 'function') {
        const raw = window.AndroidMusicBridge.getNativePlaybackState();
        if (raw && raw !== '{}') {
          const state = JSON.parse(raw);
          if (state && state.currentTrack && state.currentTrack.id) {
            this.currentTrack = state.currentTrack;
            if (typeof state.queueIndex === 'number') {
              this.queueIndex = state.queueIndex;
              this.sourceStates.device.queueIndex = state.queueIndex;
            }
            this.currentTime = state.currentTime || 0;
            this.duration = state.duration || state.currentTrack.duration || 0;
            this.isPlaying = !!state.isPlaying;
            this.updateMediaSessionMetadata();
            this.notify('trackChange', this.currentTrack);
            this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
            this.notify('timeUpdate', {
              currentTime: this.currentTime,
              duration: this.duration,
              progress: this.duration > 0 ? this.currentTime / this.duration : 0
            });
            this.notify('playStateChange', { isPlaying: this.isPlaying });
          }
        }
      }
    } catch (e) {}
  }

  notifyNativeBridge(isPlaying = this.isPlaying) {
    if (typeof window !== 'undefined' && window.AndroidMusicBridge) {
      try {
        if (typeof window.AndroidMusicBridge.syncPlaybackSource === 'function') {
          window.AndroidMusicBridge.syncPlaybackSource(this.activeSource);
        }
        const title = this.currentTrack?.title || 'MUSE Track';
        const artist = this.currentTrack?.artist || 'Unknown Artist';
        const album = this.currentTrack?.album || 'MUSE';
        let cover = this.currentTrack?.cover || '';
        if (typeof cover === 'string' && (cover.startsWith('data:image/svg') || cover.startsWith('blob:'))) {
          cover = '';
        }
        const durationSec = (this.duration && this.duration > 0) ? this.duration : (this.currentTrack?.duration || 0);
        const currentSec = this.currentTime || 0;

        if (typeof window.AndroidMusicBridge.updateState === 'function') {
          window.AndroidMusicBridge.updateState(
            title,
            artist,
            album,
            cover,
            durationSec,
            currentSec,
            isPlaying
          );
        } else if (typeof window.AndroidMusicBridge.playTrack === 'function') {
          window.AndroidMusicBridge.playTrack(title, artist, isPlaying);
        }
      } catch (e) {
        console.warn('Native bridge notify note:', e);
      }
    }
  }

  snapshotCurrentSource() {
    const curState = this.sourceStates[this.activeSource];
    if (curState) {
      curState.queue = [...this.queue];
      curState.queueIndex = this.queueIndex;
      curState.isShuffle = this.isShuffle;
      curState.repeatMode = this.repeatMode;
      curState.currentTrack = this.currentTrack;
      curState.currentTime = this.currentTime;
      curState.duration = this.duration;
    }
  }

  savePlaybackSessionState() {
    if (!this.currentTrack) return;
    try {
      this.snapshotCurrentSource();

      Storage.setPlaybackSession({
        activeSource: this.activeSource,
        currentTrack: this.currentTrack,
        currentTime: Math.floor(this.currentTime || 0),
        duration: Math.floor(this.duration || this.currentTrack.duration || 0),
        queue: this.queue.slice(0, 100),
        queueIndex: this.queueIndex,
        repeatMode: this.repeatMode,
        isShuffle: this.isShuffle,
        sourceStates: {
          youtube: {
            ...this.sourceStates.youtube,
            queue: (this.sourceStates.youtube.queue || []).slice(0, 50),
            originalQueue: (this.sourceStates.youtube.originalQueue || []).slice(0, 50)
          },
          device: {
            ...this.sourceStates.device,
            queue: (this.sourceStates.device.queue || []).slice(0, 100),
            originalQueue: (this.sourceStates.device.originalQueue || []).slice(0, 100)
          }
        },
        timestamp: Date.now()
      });
    } catch (e) {}
  }

  restorePlaybackSession() {
    const session = Storage.getPlaybackSession();
    if (!session || !session.currentTrack) {
      return false;
    }

    try {
      if (session.sourceStates) {
        if (session.sourceStates.youtube) {
          this.sourceStates.youtube = {
            ...this.sourceStates.youtube,
            ...session.sourceStates.youtube
          };
        }
        if (session.sourceStates.device) {
          this.sourceStates.device = {
            ...this.sourceStates.device,
            ...session.sourceStates.device
          };
        }
      }

      this.activeSource = session.activeSource || (isDeviceTrack(session.currentTrack) ? 'device' : 'youtube');

      if (Array.isArray(session.queue) && session.queue.length > 0) {
        this.queue = [...session.queue];
        this.queueIndex = typeof session.queueIndex === 'number' && session.queueIndex >= 0 && session.queueIndex < this.queue.length
          ? session.queueIndex
          : 0;
      } else if (this.sourceStates[this.activeSource]?.queue?.length > 0) {
        this.queue = [...this.sourceStates[this.activeSource].queue];
        this.queueIndex = this.sourceStates[this.activeSource].queueIndex || 0;
      }

      if (session.repeatMode) this.repeatMode = session.repeatMode;
      if (typeof session.isShuffle === 'boolean') this.isShuffle = session.isShuffle;

      const track = session.currentTrack;
      this.currentTrack = track;
      const savedTime = session.currentTime || 0;
      const savedDur = session.duration || track.duration || 0;
      this.currentTime = savedTime;
      this.duration = savedDur;
      this.pendingResumeTime = savedTime;
      this.isPlaying = false;

      this.lyricsEngine.parseLrc(track.lyrics || '');
      this.lyricsEngine.resetOffset();

      this.updateMediaSessionMetadata();
      this.updateMediaSessionPlaybackState('paused');

      this.notify('trackChange', track);
      this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
      this.notify('timeUpdate', {
        currentTime: savedTime,
        duration: savedDur,
        progress: savedDur > 0 ? savedTime / savedDur : 0
      });
      this.notify('playStateChange', { isPlaying: false });

      return true;
    } catch (e) {
      console.warn('Failed to restore playback session:', e);
      return false;
    }
  }

  initVisibilityListener() {
    if (typeof document !== 'undefined') {
      const handleVis = () => {
        this.savePlaybackSessionState();
        if (this.isPlaying && this.currentMode === 'yt' && this.ytPlayer) {
          this.bgAudio.play().catch(() => {});
          try {
            if (typeof this.ytPlayer.getPlayerState === 'function') {
              const state = this.ytPlayer.getPlayerState();
              if (state === window.YT?.PlayerState?.PAUSED && !this.userRequestedPause) {
                this.ytPlayer.playVideo();
              }
            }
          } catch (e) {}
        }
      };
      document.addEventListener('visibilitychange', handleVis);
      window.addEventListener('pagehide', handleVis);
    }
  }

  /**
   * Initializes YouTube IFrame API for background ad-free streaming
   */
  initYouTubePlayer() {
    if (this.ytReady && this.ytPlayer) {
      return Promise.resolve(this.ytPlayer);
    }
    if (this.ytPlayerPromise) {
      return this.ytPlayerPromise;
    }

    this.ytPlayerPromise = new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 25; // ~3.75s timeout max

      const init = () => {
        attempts++;
        if (!window.YT || !window.YT.Player) {
          if (attempts >= maxAttempts || !navigator.onLine) {
            console.warn('YouTube Player API unavailable or timed out');
            this.ytPlayerPromise = null;
            resolve(null);
            return;
          }
          setTimeout(init, 150);
          return;
        }

        const container = document.getElementById('melo-yt-container');
        if (!container) {
          if (attempts >= maxAttempts) {
            this.ytPlayerPromise = null;
            resolve(null);
            return;
          }
          setTimeout(init, 150);
          return;
        }

        try {
          this.ytPlayer = new window.YT.Player('melo-yt-container', {
            height: '1',
            width: '1',
            playerVars: {
              autoplay: 1,
              controls: 0,
              playsinline: 1,
              disablekb: 1,
              fs: 0,
              rel: 0,
              origin: window.location.origin
            },
            events: {
              onReady: (event) => {
                this.ytPlayer = event.target;
                this.ytReady = true;
                if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
                  this.ytPlayer.setVolume(this.volume * 100);
                }
                resolve(this.ytPlayer);
              },
              onStateChange: (event) => {
                this.handleYouTubeStateChange(event.data);
              },
              onError: (err) => {
                console.warn('YouTube Player error code:', err.data);
                this.isLoadingTrack = false;
                this.notify('loadingChange', { isLoading: false, track: this.currentTrack });
                if (this.currentTrack?.audioUrl) {
                  this.currentMode = 'html5';
                  this.audio.src = this.currentTrack.audioUrl;
                  this.audio.play().catch(() => {});
                }
              }
            }
          });
        } catch (e) {
          console.warn('Error constructing YT player:', e);
          this.ytPlayerPromise = null;
          resolve(null);
        }
      };

      if (window.YT && window.YT.Player) {
        init();
      } else if (navigator.onLine) {
        if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
          const tag = document.createElement('script');
          tag.src = 'https://www.youtube.com/iframe_api';
          tag.async = true;
          document.body.appendChild(tag);
        }
        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof prevReady === 'function') prevReady();
          init();
        };
        setTimeout(init, 300);
      } else {
        this.ytPlayerPromise = null;
        resolve(null);
      }
    });
  }

  handleYouTubeStateChange(state) {
    if (!window.YT) return;

    if (state === window.YT.PlayerState.PLAYING) {
      this.isPlaying = true;
      this.isLoadingTrack = false;
      this.bgAudio.play().catch(() => {});
      this.startYouTubeProgressTracker();
      this.updateMediaSessionPlaybackState('playing');
      this.notifyNativeBridge(true);
      this.savePlaybackSessionState();
      this.notify('loadingChange', { isLoading: false, track: this.currentTrack });
      this.notify('playStateChange', { isPlaying: true });
    } else if (state === window.YT.PlayerState.PAUSED) {
      if (this.isPlaying && !this.userRequestedPause) {
        // Android background playback keep-alive: screen locked or app minimized
        this.bgAudio.play().catch(() => {});
        setTimeout(() => {
          if (this.isPlaying && !this.userRequestedPause && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
            try { this.ytPlayer.playVideo(); } catch (e) {}
          }
        }, 60);
        return;
      }
      this.isPlaying = false;
      this.stopYouTubeProgressTracker();
      this.updateMediaSessionPlaybackState('paused');
      this.notifyNativeBridge(false);
      this.savePlaybackSessionState();
      this.notify('playStateChange', { isPlaying: false });
    } else if (state === window.YT.PlayerState.BUFFERING) {
      this.isLoadingTrack = true;
      this.notify('loadingChange', { isLoading: true, track: this.currentTrack });
    } else if (state === window.YT.PlayerState.ENDED) {
      this.stopYouTubeProgressTracker();
      this.handleTrackEnded();
    }
  }

  startYouTubeProgressTracker() {
    this.stopYouTubeProgressTracker();
    this.ytProgressInterval = setInterval(() => {
      let time = 0;
      let dur = this.duration || this.currentTrack?.duration || 0;

      if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        try {
          time = this.ytPlayer.getCurrentTime() || 0;
          const ytDur = typeof this.ytPlayer.getDuration === 'function' ? this.ytPlayer.getDuration() : 0;
          if (ytDur > 0) dur = ytDur;
        } catch (e) {}
      }

      // Read HTML5 audio if it is playing or if YouTube did not report progress
      if ((time === 0 || this.currentMode === 'html5') && this.audio && !isNaN(this.audio.currentTime)) {
        if (this.audio.currentTime > 0) {
          time = this.audio.currentTime;
        }
        if (this.audio.duration > 0 && !isNaN(this.audio.duration) && isFinite(this.audio.duration)) {
          dur = this.audio.duration;
        }
      }

      const durLearned = (this.duration <= 0 && dur > 0);
      this.currentTime = time;
      if (dur > 0) this.duration = dur;
      if (durLearned) {
        this.notifyNativeBridge(this.isPlaying);
      }

      if (Date.now() - this.lastSessionSave > 1500) {
        this.lastSessionSave = Date.now();
        this.savePlaybackSessionState();
      }

      const activeLyricIdx = this.lyricsEngine.getActiveIndex(this.currentTime);

      this.notify('timeUpdate', {
        currentTime: this.currentTime,
        duration: this.duration,
        progress: this.duration > 0 ? this.currentTime / this.duration : 0
      });

      this.notify('lyricsUpdate', {
        activeIndex: activeLyricIdx,
        currentTime: this.currentTime
      });

      if ('mediaSession' in navigator && this.duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: this.duration,
            playbackRate: 1,
            position: this.currentTime
          });
        } catch (e) {}
      }
    }, 200);
  }

  stopYouTubeProgressTracker() {
    if (this.ytProgressInterval) {
      clearInterval(this.ytProgressInterval);
      this.ytProgressInterval = null;
    }
  }

  updateMediaSessionPlaybackState(state) {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = state;
    }
  }

  initAudioListeners() {
    this.audio.addEventListener('play', () => {
      if (this.currentMode === 'html5') {
        this.isPlaying = true;
        this.updateMediaSessionPlaybackState('playing');
        this.notify('playStateChange', { isPlaying: true });
      }
    });

    this.audio.addEventListener('pause', () => {
      if (this.currentMode === 'html5') {
        this.isPlaying = false;
        this.updateMediaSessionPlaybackState('paused');
        this.notify('playStateChange', { isPlaying: false });
      }
    });

    this.audio.addEventListener('waiting', () => {
      if (this.currentMode === 'html5') {
        this.notify('loadingChange', { isLoading: true, track: this.currentTrack });
      }
    });

    this.audio.addEventListener('playing', () => {
      if (this.currentMode === 'html5') {
        this.isLoadingTrack = false;
        this.notify('loadingChange', { isLoading: false, track: this.currentTrack });
      }
    });

    this.audio.addEventListener('canplay', () => {
      if (this.currentMode === 'html5') {
        this.isLoadingTrack = false;
        this.notify('loadingChange', { isLoading: false, track: this.currentTrack });
      }
    });

    this.audio.addEventListener('timeupdate', () => {
      if (this.audio.currentTime > 0 || this.currentMode === 'html5') {
        this.currentTime = this.audio.currentTime;
        if (this.audio.duration > 0 && !isNaN(this.audio.duration) && isFinite(this.audio.duration)) {
          this.duration = this.audio.duration;
        }

        const activeLyricIdx = this.lyricsEngine.getActiveIndex(this.currentTime);

        this.notify('timeUpdate', {
          currentTime: this.currentTime,
          duration: this.duration || this.currentTrack?.duration || 0,
          progress: (this.duration > 0) ? (this.currentTime / this.duration) : 0
        });

        this.notify('lyricsUpdate', {
          activeIndex: activeLyricIdx,
          currentTime: this.currentTime
        });

        if ('mediaSession' in navigator && this.duration > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: this.duration,
              playbackRate: this.audio.playbackRate || 1,
              position: this.currentTime
            });
          } catch (e) {}
        }
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.audio.duration > 0 && !isNaN(this.audio.duration) && isFinite(this.audio.duration)) {
        this.duration = this.audio.duration;
      }
      this.notify('timeUpdate', {
        currentTime: this.currentTime,
        duration: this.duration,
        progress: (this.duration > 0) ? (this.currentTime / this.duration) : 0
      });
    });

    this.audio.addEventListener('ended', () => {
      if (this.currentMode === 'html5') {
        this.handleTrackEnded();
      }
    });

    this.audio.addEventListener('error', (err) => {
      if (this.currentMode === 'html5') {
        console.warn('Audio playback error', err);
        this.isLoadingTrack = false;
        this.notify('loadingChange', { isLoading: false, track: this.currentTrack });
      }
    });

    this.setupMediaSession();
  }

  setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(Math.max(0, this.currentTime - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        this.seek(Math.min(this.duration, this.currentTime + offset));
      });
    }
  }

  initEqualizerAudioContext() {
    try {
      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    } catch (err) {
      console.warn('Web Audio initialization fallback:', err);
    }
  }

  setEqualizerPreset(presetName) {
    this.currentEqPreset = presetName;
    const presets = {
      'flat': [0, 0, 0, 0, 0],
      'bass': [7, 5, 1, 0, -1],
      'vocal': [-2, 1, 6, 4, 2],
      'acoustic': [3, 2, 1, 3, 4],
      'electronic': [5, 4, 0, 3, 5],
      'rock': [5, 3, -1, 3, 6]
    };
    const gains = presets[presetName] || presets.flat;
    if (this.eqFilters && this.eqFilters.length === 5) {
      this.eqFilters.forEach((filter, idx) => {
        filter.gain.value = gains[idx] || 0;
      });
    }
  }

  setEqualizerBandGain(index, dbGain) {
    if (this.eqFilters && this.eqFilters[index]) {
      this.eqFilters[index].gain.value = dbGain;
    }
  }

  playTrackAtIndex(index, autoPlay = true) {
    if (index < 0 || index >= this.queue.length) return;
    this.queueIndex = index;
    const state = this.sourceStates[this.activeSource];
    if (state) {
      state.queueIndex = index;
      if (this.isShuffle && state.shuffleOrder && state.shuffleOrder.length > 0) {
        state.shuffleIndex = index;
      }
    }
    this.loadTrack(this.queue[index], autoPlay, this.activeSource === 'youtube');
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
  }

  removeFromQueue(index) {
    if (index < 0 || index >= this.queue.length) return;
    const removedTrack = this.queue.splice(index, 1)[0];
    const state = this.sourceStates[this.activeSource];
    if (state) {
      state.queue = this.queue;
      if (state.originalQueue) {
        state.originalQueue = state.originalQueue.filter(t => t.id !== removedTrack.id);
      }
      if (state.shuffleOrder) {
        state.shuffleOrder = state.shuffleOrder.filter(t => t.id !== removedTrack.id);
      }
      if (this.queueIndex >= this.queue.length) {
        this.queueIndex = Math.max(0, this.queue.length - 1);
      }
      state.queueIndex = this.queueIndex;
    } else {
      if (this.queueIndex >= this.queue.length) {
        this.queueIndex = Math.max(0, this.queue.length - 1);
      }
    }
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
  }

  clearQueue() {
    const state = this.sourceStates[this.activeSource];
    if (this.currentTrack) {
      this.queue = [this.currentTrack];
      this.queueIndex = 0;
      if (state) {
        state.queue = [this.currentTrack];
        state.originalQueue = [this.currentTrack];
        state.shuffleOrder = [this.currentTrack];
        state.shuffleIndex = 0;
        state.queueIndex = 0;
      }
    } else {
      this.queue = [];
      this.queueIndex = 0;
      if (state) {
        state.queue = [];
        state.originalQueue = [];
        state.shuffleOrder = [];
        state.shuffleIndex = 0;
        state.queueIndex = 0;
      }
    }
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
  }

  setQueue(tracks, startIndex = 0, autoPlay = true, explicitSource = null) {
    if (!tracks || tracks.length === 0) return;
    const targetTrack = tracks[Math.max(0, Math.min(startIndex, tracks.length - 1))];
    const source = explicitSource || (isDeviceTrack(targetTrack) ? 'device' : 'youtube');

    if (source !== this.activeSource) {
      this.snapshotCurrentSource();
      this.activeSource = source;
    }

    const state = this.sourceStates[source];
    state.originalQueue = [...tracks];
    state.repeatMode = state.repeatMode || this.repeatMode;

    if (state.isShuffle) {
      const remaining = tracks.filter((_, idx) => idx !== startIndex);
      const shuffled = shuffleArray(remaining);
      state.shuffleOrder = [targetTrack, ...shuffled];
      state.shuffleIndex = 0;
      state.queue = [...state.shuffleOrder];
      state.queueIndex = 0;
    } else {
      state.queue = [...tracks];
      state.queueIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
      state.shuffleOrder = [];
      state.shuffleIndex = 0;
    }

    this.queue = state.queue;
    this.queueIndex = state.queueIndex;
    this.isShuffle = state.isShuffle;
    this.repeatMode = state.repeatMode;

    this.loadTrack(this.queue[this.queueIndex], autoPlay, source === 'youtube');
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });

    if (source === 'youtube') {
      this.ensureQueueDepth();
    }
  }

  /**
   * Generates a smart Up Next queue tailored to the selected track (YouTube mode ONLY)
   */
  async populateSmartQueue(seedTrack) {
    if (this.activeSource !== 'youtube') return;
    if (!seedTrack || !seedTrack.artist) return;
    try {
      const seenTitles = new Set([
        (seedTrack.title || '').trim().toUpperCase(),
        ...this.queue.map(t => (t.title || '').trim().toUpperCase())
      ]);

      const freshTracks = await musicSearchService.getSmartQueueForTrack(
        seedTrack,
        SAMPLE_TRACKS,
        Array.from(seenTitles)
      );

      const additions = freshTracks.filter(t => {
        const u = (t.title || '').trim().toUpperCase();
        if (seenTitles.has(u)) return false;
        seenTitles.add(u);
        return true;
      });

      if (additions.length > 0 && this.currentTrack?.id === seedTrack.id) {
        this.queue.push(...additions);
        this.sourceStates.youtube.originalQueue.push(...additions);
        this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
      }
    } catch (e) {
      console.warn('Smart queue population fallback:', e);
    }
  }

  /**
   * Endless Queue Auto-Refill (YouTube mode ONLY)
   */
  async ensureQueueDepth(force = false) {
    if (this.activeSource !== 'youtube') return;
    if (this.isReplenishingQueue) return;
    const remaining = this.queue.length - (this.queueIndex + 1);
    if (!force && remaining >= 5) return;

    const seedTrack = this.queue[this.queue.length - 1] || this.currentTrack;
    if (!seedTrack || !seedTrack.artist) return;

    this.isReplenishingQueue = true;
    try {
      const seenTitles = new Set(this.queue.map(t => (t.title || '').trim().toUpperCase()));
      if (Array.isArray(this.history)) {
        this.history.forEach(h => {
          if (typeof h === 'string') seenTitles.add(h.trim().toUpperCase());
          else if (h && h.title) seenTitles.add((h.title || '').trim().toUpperCase());
        });
      }

      const freshTracks = await musicSearchService.getSmartQueueForTrack(
        seedTrack,
        SAMPLE_TRACKS,
        Array.from(seenTitles)
      );

      const newAdditions = freshTracks.filter(t => {
        const u = (t.title || '').trim().toUpperCase();
        if (seenTitles.has(u)) return false;
        seenTitles.add(u);
        return true;
      });

      if (newAdditions.length > 0) {
        this.queue.push(...newAdditions);
        this.sourceStates.youtube.originalQueue.push(...newAdditions);
        this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
      }
    } catch (e) {
      console.warn('Endless queue replenishment fallback:', e);
    } finally {
      this.isReplenishingQueue = false;
    }
  }

  updateMediaSessionMetadata() {
    if ('mediaSession' in navigator && this.currentTrack) {
      let coverUrl = getTrackArtworkUrl(this.currentTrack);
      if (!coverUrl || coverUrl.startsWith('data:image/svg')) {
        coverUrl = '/icons/logo.png';
      }
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: this.currentTrack.title || 'MUSE Track',
          artist: this.currentTrack.artist || 'MUSE Artist',
          album: this.currentTrack.album || 'MUSE',
          artwork: [
            { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
            { src: coverUrl, sizes: '128x128', type: 'image/jpeg' },
            { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
            { src: coverUrl, sizes: '512x512', type: 'image/jpeg' }
          ]
        });
      } catch (e) {
        console.warn('Error setting MediaSession metadata', e);
      }
    }
  }

  subscribe(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  notify(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  /**
   * Loads track with buffering/loading state & resilient background audio playback
   */
  async loadTrack(track, autoPlay = true, buildSmartQueue = true) {
    if (!track) return;
    this.userRequestedPause = false;
    track.cover = getTrackArtworkUrl(track);
    this.currentTrack = track;
    this.currentTime = 0;
    this.duration = track.duration || 0;

    // Reset progress to 0 for new track immediately
    this.notify('timeUpdate', {
      currentTime: 0,
      duration: this.duration,
      progress: 0
    });

    const isDeviceTrack = checkIsDeviceTrack(track);
    const targetSource = isDeviceTrack ? 'device' : 'youtube';

    if (targetSource !== this.activeSource) {
      this.snapshotCurrentSource();
      this.activeSource = targetSource;
      const state = this.sourceStates[targetSource];
      this.queue = state.queue;
      this.queueIndex = state.queueIndex;
      this.isShuffle = state.isShuffle;
      this.repeatMode = state.repeatMode;
    }

    // Synchronize queue index with active track
    const existingIndex = this.queue.findIndex(t => t.id === track.id);
    if (existingIndex !== -1) {
      this.queueIndex = existingIndex;
    } else {
      if (this.queue.length === 0 || this.queueIndex === 0) {
        this.queue.unshift(track);
        this.queueIndex = 0;
      } else {
        this.queue.splice(this.queueIndex + 1, 0, track);
        this.queueIndex++;
      }
      if (this.sourceStates[this.activeSource]) {
        this.sourceStates[this.activeSource].originalQueue = [...this.queue];
      }
    }
    if (this.sourceStates[this.activeSource]) {
      this.sourceStates[this.activeSource].queueIndex = this.queueIndex;
    }
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });

    // Load lyrics
    this.lyricsEngine.parseLrc(track.lyrics || '');
    this.lyricsEngine.resetOffset();

    this.updateMediaSessionMetadata();
    this.notify('trackChange', track);

    // Track play history to prevent duplicate suggestions in auto-refill
    if (track && track.title) {
      const tUpper = (track.title || '').trim().toUpperCase();
      const hist = this.sourceStates[this.activeSource]?.history || this.history;
      if (!hist.includes(tUpper)) {
        hist.push(tUpper);
        if (hist.length > 80) hist.shift();
      }
    }

    // --- 1. DEVICE MODE PLAYBACK (Strict Isolation) ---
    if (isDeviceTrack) {
      this.stopYouTubeProgressTracker();
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        try { this.ytPlayer.pauseVideo(); } catch (e) {}
      }

      // Check if Android Native Bridge is available for reliable ContentResolver playback
      const hasNativeBridge = typeof window !== 'undefined' &&
        window.AndroidMusicBridge &&
        typeof window.AndroidMusicBridge.playDeviceTrackNative === 'function';

      if (hasNativeBridge && (track.contentUri || track.filePath)) {
        this.currentMode = 'native';
        try {
          this.audio.pause();
        } catch (e) {}

        const queueJson = JSON.stringify(this.queue);
        const trackJson = JSON.stringify(track);

        window.AndroidMusicBridge.playDeviceTrackNative(
          trackJson,
          queueJson,
          this.queueIndex,
          this.isShuffle,
          this.repeatMode
        );

        this.isPlaying = autoPlay;
        this.updateMediaSessionPlaybackState(autoPlay ? 'playing' : 'paused');
        if (autoPlay) {
          this.startNativeProgressTracker();
        } else {
          this.stopNativeProgressTracker();
        }
        this.notify('playStateChange', { isPlaying: autoPlay });
        this.savePlaybackSessionState();
        return;
      }

      // Web / Browser / Manual Blob Fallback
      this.currentMode = 'html5';
      this.stopNativeProgressTracker();

      let audioSrc = null;
      if (track.blob instanceof Blob) {
        audioSrc = URL.createObjectURL(track.blob);
      } else if (track.contentUri) {
        if (typeof window !== 'undefined' && window.Capacitor && typeof window.Capacitor.convertFileSrc === 'function') {
          audioSrc = window.Capacitor.convertFileSrc(track.contentUri);
        } else {
          audioSrc = track.contentUri;
        }
      } else {
        const audioBlob = await Storage.getOfflineAudioBlob(track.id);
        if (audioBlob instanceof Blob) {
          audioSrc = URL.createObjectURL(audioBlob);
        }
      }

      if (!audioSrc) {
        console.warn('Device audio track is unavailable:', track.title);
        this.isLoadingTrack = false;
        this.notify('loadingChange', { isLoading: false, track });
        window.dispatchEvent(new CustomEvent('melo-toast', {
          detail: {
            message: `Unavailable: ${track.title}`,
            isSuccess: false
          }
        }));
        return;
      }

      try {
        this.audio.src = audioSrc;
        this.audio.loop = false;
        this.audio.load();
        if (autoPlay) {
          this.play();
        }
        this.savePlaybackSessionState();
        this.notifyNativeBridge(autoPlay);
      } catch (err) {
        console.error('Error loading device track into HTML5 Audio:', err);
      }
      return;
    }

    // --- 2. YOUTUBE MODE PLAYBACK ---
    if (buildSmartQueue) {
      this.populateSmartQueue(track);
    } else {
      this.ensureQueueDepth();
    }

    // Check offline cached audio blob for YouTube track
    let audioBlob = track.blob;
    if (!audioBlob && !navigator.onLine) {
      audioBlob = await Storage.getOfflineAudioBlob(track.id);
    }

    if (audioBlob && (!navigator.onLine || isDeviceTrack)) {
      this.currentMode = 'html5';
      this.stopYouTubeProgressTracker();
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        try { this.ytPlayer.pauseVideo(); } catch (e) {}
      }

      this.audio.src = URL.createObjectURL(audioBlob);
      this.audio.loop = false;
      this.audio.load();
      if (autoPlay) this.play();
      this.savePlaybackSessionState();
      this.notifyNativeBridge(autoPlay);
      return;
    }

    // Offline check: if offline and no cached audio blob, notify user
    if (!navigator.onLine) {
      this.isLoadingTrack = false;
      this.notify('loadingChange', { isLoading: false, track });
      window.dispatchEvent(new CustomEvent('melo-toast', {
        detail: {
          message: 'Track not downloaded for offline',
          isSuccess: false
        }
      }));
      return;
    }

    // Online Track: Stream full master track ad-free from YouTube (full length, not 30-sec preview!)
    this.isLoadingTrack = true;
    this.notify('loadingChange', { isLoading: true, track });

    let youtubeId = track.youtubeId;
    if (!youtubeId && navigator.onLine) {
      youtubeId = await musicSearchService.resolveYouTubeVideoId(track);
      if (youtubeId) {
        track.youtubeId = youtubeId;
      }
    }

    let playedViaYouTube = false;
    if (youtubeId && navigator.onLine) {
      if (!this.ytPlayer || !this.ytReady) {
        await Promise.race([
          this.initYouTubePlayer(),
          new Promise((r) => setTimeout(() => r(null), 3500))
        ]);
      }

      if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
        this.currentMode = 'yt';
        this.audio.pause();
        const startSec = this.pendingResumeTime || 0;
        this.pendingResumeTime = 0;
        this.ytPlayer.loadVideoById({
          videoId: youtubeId,
          startSeconds: startSec
        });

        if (autoPlay) {
          this.isPlaying = true;
          this.bgAudio.play().catch(() => {});
          this.startYouTubeProgressTracker();
          this.updateMediaSessionPlaybackState('playing');
        } else {
          setTimeout(() => {
            if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
              this.ytPlayer.pauseVideo();
              this.updateMediaSessionPlaybackState('paused');
            }
          }, 100);
        }
        playedViaYouTube = true;
      }
    }

    // Only fallback to audioUrl if YouTube was completely unavailable or failed
    if (!playedViaYouTube) {
      if (youtubeId && navigator.onLine) {
        // Retry once YouTube player finishes initialization instead of dropping to 30s preview
        this.initYouTubePlayer().then((player) => {
          if (player && typeof player.loadVideoById === 'function' && this.currentTrack?.id === track.id) {
            this.currentMode = 'yt';
            this.audio.pause();
            const startSec = this.pendingResumeTime || 0;
            this.pendingResumeTime = 0;
            player.loadVideoById({
              videoId: youtubeId,
              startSeconds: startSec
            });
            if (autoPlay) {
              this.isPlaying = true;
              this.bgAudio.play().catch(() => {});
              this.startYouTubeProgressTracker();
              this.updateMediaSessionPlaybackState('playing');
            }
            this.isLoadingTrack = false;
            this.notify('loadingChange', { isLoading: false, track });
          }
        }).catch(() => {});
      } else if (track.audioUrl) {
        this.currentMode = 'html5';
        this.stopYouTubeProgressTracker();
        if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
          try { this.ytPlayer.pauseVideo(); } catch (e) {}
        }
        this.audio.src = track.audioUrl;
        this.audio.loop = false;
        this.audio.load();
        const startSec = this.pendingResumeTime || 0;
        this.pendingResumeTime = 0;
        if (startSec > 0) {
          this.audio.currentTime = startSec;
        }
        if (autoPlay) this.play();
        this.isLoadingTrack = false;
        this.notify('loadingChange', { isLoading: false, track });
      } else {
        window.dispatchEvent(new CustomEvent('melo-toast', {
          detail: {
            message: 'Unable to stream track',
            isSuccess: false
          }
        }));
        this.isLoadingTrack = false;
        this.notify('loadingChange', { isLoading: false, track });
      }
    }

    // Add to history
    if (!this.history.includes(track.id)) {
      this.history.unshift(track.id);
      if (this.history.length > 50) this.history.pop();
    }
    Storage.addRecentSong(track);
    this.savePlaybackSessionState();
    this.notifyNativeBridge(autoPlay);
  }

  async play() {
    this.userRequestedPause = false;
    this.bgAudio.play().catch(() => {});
    this.notifyNativeBridge(true);
    if (!this.currentTrack && this.queue.length > 0) {
      this.loadTrack(this.queue[this.queueIndex], true);
      return;
    }

    if (this.activeSource === 'device') {
      if (this.currentMode === 'native' && typeof window !== 'undefined' && window.AndroidMusicBridge && typeof window.AndroidMusicBridge.resumeDeviceAudio === 'function') {
        window.AndroidMusicBridge.resumeDeviceAudio();
        this.isPlaying = true;
        this.startNativeProgressTracker();
        this.updateMediaSessionPlaybackState('playing');
        this.notify('playStateChange', { isPlaying: true });
        this.savePlaybackSessionState();
        return;
      }
    }

    const resumeTime = this.pendingResumeTime;
    this.pendingResumeTime = 0;

    if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      this.audio.pause();
      if (resumeTime > 0 && typeof this.ytPlayer.seekTo === 'function') {
        try { this.ytPlayer.seekTo(resumeTime, true); } catch (e) {}
      }
      this.ytPlayer.playVideo();
      this.isPlaying = true;
      this.startYouTubeProgressTracker();
      this.updateMediaSessionPlaybackState('playing');
      this.notify('playStateChange', { isPlaying: true });
      this.savePlaybackSessionState();
      return;
    }

    this.initEqualizerAudioContext();
    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try { this.ytPlayer.pauseVideo(); } catch (e) {}
    }

    try {
      this.audio.loop = false;
      if (resumeTime > 0) {
        this.audio.currentTime = resumeTime;
      }
      await this.audio.play();
      this.isPlaying = true;
      this.startYouTubeProgressTracker();
      this.updateMediaSessionPlaybackState('playing');
      this.notify('playStateChange', { isPlaying: true });
      this.savePlaybackSessionState();
    } catch (e) {
      console.warn('Playback error', e);
    }
  }

  pause() {
    this.userRequestedPause = true;
    this.notifyNativeBridge(false);
    this.savePlaybackSessionState();
    try { this.bgAudio.pause(); } catch (e) {}

    if (this.activeSource === 'device') {
      if (this.currentMode === 'native' && typeof window !== 'undefined' && window.AndroidMusicBridge && typeof window.AndroidMusicBridge.pauseDeviceAudio === 'function') {
        window.AndroidMusicBridge.pauseDeviceAudio();
        this.isPlaying = false;
        this.stopNativeProgressTracker();
        this.updateMediaSessionPlaybackState('paused');
        this.notify('playStateChange', { isPlaying: false });
        return;
      }
    }

    if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      this.ytPlayer.pauseVideo();
      this.isPlaying = false;
      this.stopYouTubeProgressTracker();
      this.updateMediaSessionPlaybackState('paused');
      this.notify('playStateChange', { isPlaying: false });
      return;
    }

    this.audio.pause();
    this.isPlaying = false;
    this.stopYouTubeProgressTracker();
    this.updateMediaSessionPlaybackState('paused');
    this.notify('playStateChange', { isPlaying: false });
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(seconds) {
    if (isNaN(seconds)) return;
    const clamped = Math.max(0, Math.min(seconds, this.duration || 9999));
    this.currentTime = clamped;

    if (this.activeSource === 'device') {
      if (this.currentMode === 'native' && typeof window !== 'undefined' && window.AndroidMusicBridge && typeof window.AndroidMusicBridge.seekDeviceAudio === 'function') {
        window.AndroidMusicBridge.seekDeviceAudio(clamped);
        this.notify('timeUpdate', {
          currentTime: clamped,
          duration: this.duration,
          progress: this.duration > 0 ? clamped / this.duration : 0
        });
        return;
      }
    }

    if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      this.ytPlayer.seekTo(clamped, true);
      this.notifyNativeBridge(this.isPlaying);
      return;
    }

    this.audio.currentTime = clamped;
    this.notifyNativeBridge(this.isPlaying);
  }

  seekRatio(ratio) {
    const clamped = Math.max(0, Math.min(ratio, 1));
    const target = clamped * (this.duration || this.currentTrack?.duration || 0);
    this.seek(target);
  }

  async next() {
    if (this.queue.length === 0) return;

    if (this.repeatMode === 'one') {
      this.seek(0);
      this.play();
      return;
    }

    const state = this.sourceStates[this.activeSource];

    if (this.isShuffle) {
      let shuffleOrder = (state && state.shuffleOrder && state.shuffleOrder.length > 0)
        ? state.shuffleOrder
        : [...this.queue];

      if (state) state.shuffleOrder = shuffleOrder;
      let shuffleIndex = (state && typeof state.shuffleIndex === 'number') ? state.shuffleIndex : 0;

      if (shuffleIndex < shuffleOrder.length - 1) {
        shuffleIndex++;
        if (state) state.shuffleIndex = shuffleIndex;
        const nextTrack = shuffleOrder[shuffleIndex];
        this.queueIndex = this.queue.findIndex(t => t.id === nextTrack.id);
        if (this.queueIndex === -1) this.queueIndex = 0;
        if (state) state.queueIndex = this.queueIndex;
        this.loadTrack(nextTrack, true, false);
      } else {
        // End of current shuffle cycle! Every eligible track has played once.
        if (this.repeatMode === 'off') {
          this.pause();
          this.seek(0);
          return;
        } else if (this.repeatMode === 'all') {
          // Start a new shuffle cycle avoiding repeating the last track immediately
          const lastTrack = shuffleOrder[shuffleOrder.length - 1];
          const pool = (state && state.originalQueue && state.originalQueue.length > 0)
            ? [...state.originalQueue]
            : [...this.queue];
          let newShuffled = shuffleArray(pool);

          if (newShuffled.length > 1 && lastTrack && newShuffled[0].id === lastTrack.id) {
            const swapIdx = 1 + Math.floor(Math.random() * (newShuffled.length - 1));
            [newShuffled[0], newShuffled[swapIdx]] = [newShuffled[swapIdx], newShuffled[0]];
          }

          if (state) {
            state.shuffleOrder = newShuffled;
            state.shuffleIndex = 0;
            state.queue = newShuffled;
            state.queueIndex = 0;
          }
          this.queue = newShuffled;
          this.queueIndex = 0;
          this.loadTrack(newShuffled[0], true, false);
        }
      }

      this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
      if (this.activeSource === 'youtube') {
        this.ensureQueueDepth();
      }
      return;
    }

    // --- SEQUENTIAL PLAYBACK (Shuffle OFF) ---
    if (this.activeSource === 'youtube' && this.queueIndex >= this.queue.length - 1) {
      await this.ensureQueueDepth(true);
    }

    if (this.queueIndex < this.queue.length - 1) {
      this.queueIndex++;
      if (state) state.queueIndex = this.queueIndex;
      this.loadTrack(this.queue[this.queueIndex], true, false);
    } else {
      // Reached the end of queue
      if (this.repeatMode === 'all') {
        this.queueIndex = 0;
        if (state) state.queueIndex = 0;
        this.loadTrack(this.queue[0], true, false);
      } else {
        // Repeat OFF -> stop playback at the end
        this.pause();
        this.seek(0);
      }
    }

    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
    if (this.activeSource === 'youtube') {
      this.ensureQueueDepth();
    }
  }

  prev() {
    if (this.queue.length === 0) return;

    if (this.currentTime > 3) {
      this.seek(0);
      return;
    }

    const state = this.sourceStates[this.activeSource];

    if (this.isShuffle) {
      let shuffleOrder = (state && state.shuffleOrder && state.shuffleOrder.length > 0)
        ? state.shuffleOrder
        : [...this.queue];
      let shuffleIndex = (state && typeof state.shuffleIndex === 'number') ? state.shuffleIndex : 0;

      if (shuffleIndex > 0) {
        shuffleIndex--;
        if (state) state.shuffleIndex = shuffleIndex;
        const prevTrack = shuffleOrder[shuffleIndex];
        this.queueIndex = this.queue.findIndex(t => t.id === prevTrack.id);
        if (this.queueIndex === -1) this.queueIndex = 0;
        if (state) state.queueIndex = this.queueIndex;
        this.loadTrack(prevTrack, true, false);
      } else {
        if (this.repeatMode === 'all') {
          shuffleIndex = Math.max(0, shuffleOrder.length - 1);
          if (state) state.shuffleIndex = shuffleIndex;
          const prevTrack = shuffleOrder[shuffleIndex];
          this.queueIndex = this.queue.findIndex(t => t.id === prevTrack.id);
          if (this.queueIndex === -1) this.queueIndex = 0;
          if (state) state.queueIndex = this.queueIndex;
          this.loadTrack(prevTrack, true, false);
        } else {
          this.seek(0);
        }
      }

      this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
      return;
    }

    // Sequential prev
    if (this.queueIndex > 0) {
      this.queueIndex--;
    } else {
      if (this.repeatMode === 'all') {
        this.queueIndex = this.queue.length - 1;
      } else {
        this.seek(0);
        return;
      }
    }

    if (state) state.queueIndex = this.queueIndex;
    this.loadTrack(this.queue[this.queueIndex], true, false);
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
  }

  handleTrackEnded() {
    if (this.repeatMode === 'one') {
      this.seek(0);
      this.play();
    } else {
      this.next();
    }
  }

  toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(this.repeatMode) + 1) % modes.length;
    this.repeatMode = modes[nextIdx];
    if (this.sourceStates[this.activeSource]) {
      this.sourceStates[this.activeSource].repeatMode = this.repeatMode;
    }
    return this.repeatMode;
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    const state = this.sourceStates[this.activeSource];
    if (state) {
      state.isShuffle = this.isShuffle;
    }

    if (this.isShuffle) {
      // Enabling shuffle during playback:
      // Keep the current song playing and shuffle the remaining eligible tracks
      const current = this.currentTrack || this.queue[this.queueIndex];
      const orig = (state && state.originalQueue && state.originalQueue.length > 0)
        ? state.originalQueue
        : [...this.queue];

      if (state) state.originalQueue = [...orig];

      if (current) {
        const remaining = orig.filter(t => t.id !== current.id);
        const shuffled = shuffleArray(remaining);
        const shuffledOrder = [current, ...shuffled];
        if (state) {
          state.shuffleOrder = shuffledOrder;
          state.shuffleIndex = 0;
          state.queue = [...shuffledOrder];
          state.queueIndex = 0;
        }
        this.queue = [...shuffledOrder];
        this.queueIndex = 0;
      } else {
        const shuffledOrder = shuffleArray([...orig]);
        if (state) {
          state.shuffleOrder = shuffledOrder;
          state.shuffleIndex = 0;
          state.queue = [...shuffledOrder];
          state.queueIndex = 0;
        }
        this.queue = [...shuffledOrder];
        this.queueIndex = 0;
      }
    } else {
      // Disabling shuffle:
      // Restore sequential playback from current track's position in original queue
      const current = this.currentTrack || this.queue[this.queueIndex];
      const orig = (state && state.originalQueue && state.originalQueue.length > 0)
        ? state.originalQueue
        : [...this.queue];

      this.queue = [...orig];
      if (state) {
        state.queue = this.queue;
      }

      if (current) {
        const origIdx = orig.findIndex(t => t.id === current.id);
        this.queueIndex = origIdx !== -1 ? origIdx : 0;
      } else {
        this.queueIndex = 0;
      }

      if (state) {
        state.queueIndex = this.queueIndex;
        state.shuffleOrder = [];
        state.shuffleIndex = 0;
      }
    }

    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
    return this.isShuffle;
  }

  addToQueue(track, playNext = false) {
    if (!track) return;
    if (playNext) {
      this.queue.splice(this.queueIndex + 1, 0, track);
    } else {
      this.queue.push(track);
    }
    const state = this.sourceStates[this.activeSource];
    if (state) {
      state.queue = [...this.queue];
      if (state.originalQueue) {
        if (playNext) {
          state.originalQueue.splice(this.queueIndex + 1, 0, track);
        } else {
          state.originalQueue.push(track);
        }
      }
    }
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
  }
}

export const audioEngine = new AudioEngine();
if (typeof window !== 'undefined') {
  window.audioEngine = audioEngine;
}
