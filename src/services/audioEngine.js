// Enterprise Unified Audio Controller for Melo (Ad-Free YouTube Master Streams + Web Audio Equalizer + Offline Playback + MediaSession)
import { SAMPLE_TRACKS, DEFAULT_FALLBACK_COVER } from '../data/samples.js';
import { Storage } from './storage.js';
import { LyricsEngine } from './lyricsService.js';
import { musicSearchService } from './musicSearchService.js';

export class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    // Dedicated background audio keep-alive for Android native lockscreen playback
    this.bgAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    this.bgAudio.loop = true;
    this.bgAudio.volume = 0.001;

    // Playback modes: 'yt' (ad-free YouTube master audio) or 'html5' (offline blob / device music)
    this.currentMode = 'yt';

    // YouTube IFrame Player instance
    this.ytPlayer = null;
    this.ytReady = false;
    this.ytProgressInterval = null;

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
        } else if (action === 'next') {
          this.next();
        } else if (action === 'previous') {
          this.prev();
        }
      });

      window.addEventListener('beforeunload', () => this.savePlaybackSessionState());
      window.addEventListener('pagehide', () => this.savePlaybackSessionState());
    }
  }

  notifyNativeBridge(isPlaying = this.isPlaying) {
    if (typeof window !== 'undefined' && window.AndroidMusicBridge) {
      try {
        window.AndroidMusicBridge.playTrack(
          this.currentTrack?.title || 'MUSE Music',
          this.currentTrack?.artist || 'Unknown Artist',
          isPlaying
        );
      } catch (e) {
        console.warn('Native bridge notify note:', e);
      }
    }
  }

  savePlaybackSessionState() {
    if (!this.currentTrack) return;
    try {
      Storage.setPlaybackSession({
        currentTrack: this.currentTrack,
        currentTime: Math.floor(this.currentTime || 0),
        duration: Math.floor(this.duration || this.currentTrack.duration || 0),
        queue: this.queue.slice(0, 50),
        queueIndex: this.queueIndex,
        repeatMode: this.repeatMode,
        isShuffle: this.isShuffle,
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
      if (Array.isArray(session.queue) && session.queue.length > 0) {
        this.queue = [...session.queue];
        this.queueIndex = typeof session.queueIndex === 'number' && session.queueIndex >= 0 && session.queueIndex < this.queue.length
          ? session.queueIndex
          : 0;
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
      document.addEventListener('visibilitychange', () => {
        this.savePlaybackSessionState();
        if (!document.hidden && this.isPlaying && this.currentMode === 'yt' && this.ytPlayer) {
          try {
            if (typeof this.ytPlayer.getPlayerState === 'function') {
              const state = this.ytPlayer.getPlayerState();
              if (state === window.YT?.PlayerState?.PAUSED && !this.userRequestedPause) {
                this.ytPlayer.playVideo();
              }
            }
          } catch (e) {}
        }
      });
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
      this.startYouTubeProgressTracker();
      this.updateMediaSessionPlaybackState('playing');
      this.notifyNativeBridge(true);
      this.savePlaybackSessionState();
      this.notify('loadingChange', { isLoading: false, track: this.currentTrack });
      this.notify('playStateChange', { isPlaying: true });
    } else if (state === window.YT.PlayerState.PAUSED) {
      if (this.isPlaying && !this.userRequestedPause) {
        // Android background playback keep-alive: screen locked or app minimized
        try {
          if (this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
            this.ytPlayer.playVideo();
            return;
          }
        } catch (e) {}
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

      if (this.currentMode === 'yt' && this.ytPlayer) {
        try {
          if (typeof this.ytPlayer.getCurrentTime === 'function') {
            time = this.ytPlayer.getCurrentTime() || 0;
            const ytDur = typeof this.ytPlayer.getDuration === 'function' ? this.ytPlayer.getDuration() : 0;
            if (ytDur > 0) dur = ytDur;
          }
        } catch (e) {}
      } else if (this.currentMode === 'html5' && this.audio) {
        time = this.audio.currentTime || 0;
        if (this.audio.duration > 0) dur = this.audio.duration;
      }

      this.currentTime = time;
      if (dur > 0) this.duration = dur;

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
      if (this.currentMode !== 'html5') return;
      this.currentTime = this.audio.currentTime;
      this.duration = this.audio.duration || this.currentTrack?.duration || 0;

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
            playbackRate: this.audio.playbackRate,
            position: this.currentTime
          });
        } catch (e) {}
      }
    });

    this.audio.addEventListener('loadedmetadata', () => {
      if (this.currentMode === 'html5') {
        this.duration = this.audio.duration;
        this.notify('timeUpdate', {
          currentTime: this.currentTime,
          duration: this.duration,
          progress: 0
        });
      }
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
    this.loadTrack(this.queue[index], autoPlay);
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
  }

  removeFromQueue(index) {
    if (index < 0 || index >= this.queue.length) return;
    this.queue.splice(index, 1);
    if (this.queueIndex >= this.queue.length) {
      this.queueIndex = Math.max(0, this.queue.length - 1);
    }
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
  }

  clearQueue() {
    if (this.currentTrack) {
      this.queue = [this.currentTrack];
      this.queueIndex = 0;
    } else {
      this.queue = [];
      this.queueIndex = 0;
    }
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
  }

  setQueue(tracks, startIndex = 0, autoPlay = true) {
    if (!tracks || tracks.length === 0) return;
    this.queue = [...tracks];
    this.queueIndex = Math.max(0, Math.min(startIndex, this.queue.length - 1));
    this.loadTrack(this.queue[this.queueIndex], autoPlay);
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
    this.ensureQueueDepth();
  }

  /**
   * Endless Queue Auto-Refill (YouTube / Spotify Style)
   * As the listener approaches the end of the queue (or on the last song),
   * automatically fetches non-repeating recommendations by varied related artists.
   */
  async ensureQueueDepth() {
    if (this.isReplenishingQueue) return;
    const remaining = this.queue.length - (this.queueIndex + 1);
    if (remaining > 4) return; // Keep at least 4-5 upcoming tracks in queue

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
      let coverUrl = this.currentTrack.cover;
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
   * Loads track with buffering/loading state & streams the real song ad-free from YouTube
   */
  async loadTrack(track, autoPlay = true) {
    if (!track) return;
    this.userRequestedPause = false;
    this.currentTrack = track;
    this.currentTime = 0;
    this.duration = track.duration || 0;

    // Reset progress to 0 for new track immediately
    this.notify('timeUpdate', {
      currentTime: 0,
      duration: this.duration,
      progress: 0
    });

    // Synchronize queue index with active track
    const existingIndex = this.queue.findIndex(t => t.id === track.id);
    if (existingIndex !== -1) {
      this.queueIndex = existingIndex;
    } else {
      this.queue.splice(this.queueIndex, 0, track);
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
      if (!this.history.includes(tUpper)) {
        this.history.push(tUpper);
        if (this.history.length > 80) this.history.shift();
      }
    }
    this.ensureQueueDepth();

    // 1. Check offline cached audio blob or device music file
    // Device tracks (local MP3s) or offline playback use local blob
    const isDeviceTrack = track.isDeviceMusic || track.source === 'device' || track.blob instanceof Blob;
    let audioBlob = track.blob;
    if (!audioBlob && (!navigator.onLine || isDeviceTrack)) {
      audioBlob = await Storage.getOfflineAudioBlob(track.id);
    }

    // Only play cached audio blob if offline OR if it is a local device file.
    // When online, ALWAYS stream the full master track from YouTube!
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
      return;
    }

    // 2. Offline check: if offline and no cached audio blob, notify user
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

    // 3. Online Track: Stream exact master audio ad-free from YouTube or high-res audio stream
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

    // Fallback to HTML5 audio stream if YouTube was unavailable or failed
    if (!playedViaYouTube) {
      if (track.audioUrl) {
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
      } else {
        window.dispatchEvent(new CustomEvent('melo-toast', {
          detail: {
            message: 'Unable to stream track',
            isSuccess: false
          }
        }));
      }
      this.isLoadingTrack = false;
      this.notify('loadingChange', { isLoading: false, track });
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

    if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      this.ytPlayer.seekTo(clamped, true);
      return;
    }

    this.audio.currentTime = clamped;
  }

  seekRatio(ratio) {
    const clamped = Math.max(0, Math.min(ratio, 1));
    const target = clamped * (this.duration || this.currentTrack?.duration || 0);
    this.seek(target);
  }

  next() {
    if (this.queue.length === 0) return;

    if (this.repeatMode === 'one') {
      this.seek(0);
      this.play();
      return;
    }

    if (this.isShuffle) {
      this.queueIndex = Math.floor(Math.random() * this.queue.length);
    } else if (this.queueIndex < this.queue.length - 1) {
      this.queueIndex++;
    } else {
      // Reached the end of upcoming tracks: auto-replenish and loop if needed
      if (this.repeatMode === 'all') {
        this.queueIndex = (this.queueIndex + 1) % this.queue.length;
      }
    }

    this.loadTrack(this.queue[this.queueIndex], true);
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
    this.ensureQueueDepth();
  }

  prev() {
    if (this.queue.length === 0) return;

    if (this.currentTime > 3) {
      this.seek(0);
      return;
    }

    if (this.queueIndex > 0) {
      this.queueIndex--;
    } else {
      this.queueIndex = this.queue.length - 1;
    }

    this.loadTrack(this.queue[this.queueIndex], true);
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
  }

  handleTrackEnded() {
    if (this.repeatMode === 'one') {
      this.seek(0);
      this.play();
    } else {
      // Move to next track and auto-refill queue with fresh recommendations
      this.next();
    }
  }

  toggleRepeat() {
    const modes = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(this.repeatMode) + 1) % modes.length;
    this.repeatMode = modes[nextIdx];
    return this.repeatMode;
  }

  toggleShuffle() {
    this.isShuffle = !this.isShuffle;
    return this.isShuffle;
  }

  addToQueue(track, playNext = false) {
    if (!track) return;
    if (playNext) {
      this.queue.splice(this.queueIndex + 1, 0, track);
    } else {
      this.queue.push(track);
    }
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
  }
}

export const audioEngine = new AudioEngine();
if (typeof window !== 'undefined') {
  window.audioEngine = audioEngine;
}
