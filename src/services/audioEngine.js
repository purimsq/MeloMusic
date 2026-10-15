// Enterprise Unified Audio Controller for Melo (Ad-Free YouTube Master Streams + Web Audio Equalizer + Offline Playback + MediaSession)
import { SAMPLE_TRACKS, DEFAULT_FALLBACK_COVER } from '../data/samples.js';
import { Storage } from './storage.js';
import { LyricsEngine } from './lyricsService.js';
import { musicSearchService } from './musicSearchService.js';

export class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

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
    this.history = []; // rolling 50 IDs to prevent repetition

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
  }

  /**
   * Initializes YouTube IFrame API for background ad-free streaming
   */
  initYouTubePlayer() {
    return new Promise((resolve) => {
      const init = () => {
        if (!window.YT || !window.YT.Player) {
          setTimeout(init, 150);
          return;
        }

        const container = document.getElementById('melo-yt-container');
        if (!container) {
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
              }
            }
          });
        } catch (e) {
          console.warn('Error constructing YT player:', e);
        }
      };

      if (window.YT && window.YT.Player) {
        init();
      } else {
        const prevReady = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (typeof prevReady === 'function') prevReady();
          init();
        };
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
      this.notify('loadingChange', { isLoading: false, track: this.currentTrack });
      this.notify('playStateChange', { isPlaying: true });
    } else if (state === window.YT.PlayerState.PAUSED) {
      this.isPlaying = false;
      this.stopYouTubeProgressTracker();
      this.updateMediaSessionPlaybackState('paused');
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
  }

  updateMediaSessionMetadata() {
    if ('mediaSession' in navigator && this.currentTrack) {
      const coverUrl = this.currentTrack.cover || DEFAULT_FALLBACK_COVER;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: this.currentTrack.title,
        artist: this.currentTrack.artist,
        album: this.currentTrack.album || 'Melo',
        artwork: [
          { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: coverUrl, sizes: '128x128', type: 'image/jpeg' },
          { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: coverUrl, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
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
    this.currentTrack = track;

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

    // 1. Check offline cached audio blob or device music file
    let audioBlob = track.blob;
    if (!audioBlob) {
      audioBlob = await Storage.getOfflineAudioBlob(track.id);
    }

    if (audioBlob) {
      this.currentMode = 'html5';
      this.stopYouTubeProgressTracker();
      if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
        try { this.ytPlayer.pauseVideo(); } catch (e) {}
      }

      this.audio.src = URL.createObjectURL(audioBlob);
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
          message: `"${track.title}" is not downloaded for offline use. Play a downloaded song or device track.`,
          isSuccess: false
        }
      }));
      return;
    }

    // 3. Online Track: Stream exact master audio ad-free from YouTube
    this.currentMode = 'yt';
    this.audio.pause();
    this.isLoadingTrack = true;
    this.notify('loadingChange', { isLoading: true, track });

    let youtubeId = track.youtubeId;
    if (!youtubeId) {
      youtubeId = await musicSearchService.resolveYouTubeVideoId(track);
      if (youtubeId) {
        track.youtubeId = youtubeId;
      }
    }

    if (youtubeId) {
      if (!this.ytPlayer || !this.ytReady) {
        await this.initYouTubePlayer();
      }

      if (this.ytPlayer && typeof this.ytPlayer.loadVideoById === 'function') {
        this.ytPlayer.loadVideoById({
          videoId: youtubeId,
          startSeconds: 0
        });

        if (autoPlay) {
          this.isPlaying = true;
          this.startYouTubeProgressTracker();
        } else {
          setTimeout(() => {
            if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
              this.ytPlayer.pauseVideo();
            }
          }, 100);
        }
      }
    } else {
      // Fallback to HTML5 audioUrl if provided
      if (track.audioUrl) {
        this.currentMode = 'html5';
        this.audio.src = track.audioUrl;
        this.audio.load();
        if (autoPlay) this.play();
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
  }

  async play() {
    if (!this.currentTrack && this.queue.length > 0) {
      this.loadTrack(this.queue[this.queueIndex], true);
      return;
    }

    if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      this.audio.pause();
      this.ytPlayer.playVideo();
      this.isPlaying = true;
      this.startYouTubeProgressTracker();
      this.updateMediaSessionPlaybackState('playing');
      this.notify('playStateChange', { isPlaying: true });
      return;
    }

    this.initEqualizerAudioContext();
    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try { this.ytPlayer.pauseVideo(); } catch (e) {}
    }

    try {
      await this.audio.play();
    } catch (e) {
      console.warn('Playback error', e);
    }
  }

  pause() {
    if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      this.ytPlayer.pauseVideo();
      this.isPlaying = false;
      this.stopYouTubeProgressTracker();
      this.updateMediaSessionPlaybackState('paused');
      this.notify('playStateChange', { isPlaying: false });
      return;
    }

    this.audio.pause();
    this.stopYouTubeProgressTracker();
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
    } else {
      this.queueIndex = (this.queueIndex + 1) % this.queue.length;
    }

    this.loadTrack(this.queue[this.queueIndex], true);
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
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
    } else if (this.repeatMode === 'all' || this.queueIndex < this.queue.length - 1) {
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
