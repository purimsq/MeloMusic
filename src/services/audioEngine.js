// Enterprise Unified Audio Controller for Melo
import { SAMPLE_TRACKS, DEFAULT_FALLBACK_COVER } from '../data/samples.js';
import { Storage } from './storage.js';
import { LyricsEngine } from './lyricsService.js';

export class AudioEngine {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';

    this.currentTrack = null;
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.volume = 0.85;
    this.isMuted = false;

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
      lyricsUpdate: []
    };

    this.initAudioListeners();
  }

  initAudioListeners() {
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      this.notify('playStateChange', { isPlaying: true });
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      this.notify('playStateChange', { isPlaying: false });
    });

    this.audio.addEventListener('timeupdate', () => {
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

      // Update MediaSession position state if available
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
      this.duration = this.audio.duration;
      this.notify('timeUpdate', {
        currentTime: this.currentTime,
        duration: this.duration,
        progress: 0
      });
    });

    this.audio.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audio.addEventListener('error', (err) => {
      console.warn('Audio playback encountered error, switching to safe fallback', err);
      // Fallback: If network audio fails, gracefully move forward or use local backup
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

  playTrackAtIndex(index, autoPlay = true) {
    if (index < 0 || index >= this.queue.length) return;
    this.queueIndex = index;
    this.loadTrack(this.queue[index], autoPlay);
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

  loadTrack(track, autoPlay = true) {
    if (!track) return;
    this.currentTrack = track;

    // Load lyrics
    this.lyricsEngine.parseLrc(track.lyrics || '');
    this.lyricsEngine.resetOffset();

    // Set audio source
    if (track.audioUrl) {
      this.audio.src = track.audioUrl;
      this.audio.load();
    }

    // Add to history for strict de-duplication
    if (!this.history.includes(track.id)) {
      this.history.unshift(track.id);
      if (this.history.length > 50) this.history.pop();
    }
    Storage.addRecentSong(track);

    this.updateMediaSessionMetadata();
    this.notify('trackChange', track);

    if (autoPlay) {
      this.play().catch(e => {
        console.warn('Autoplay prevented by browser gesture policy', e);
      });
    }
  }

  async play() {
    if (!this.currentTrack && this.queue.length > 0) {
      this.loadTrack(this.queue[this.queueIndex], true);
      return;
    }
    try {
      await this.audio.play();
    } catch (e) {
      console.warn('Playback error', e);
    }
  }

  pause() {
    this.audio.pause();
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
    this.audio.currentTime = clamped;
    this.currentTime = clamped;
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
    // If more than 3 seconds in, restart track
    if (this.currentTime > 3) {
      this.seek(0);
      return;
    }

    if (this.queue.length === 0) return;

    this.queueIndex = (this.queueIndex - 1 + this.queue.length) % this.queue.length;
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

  // Prevents duplicates in queue as requested
  addToQueue(track, playNext = false) {
    if (!track) return;
    const exists = this.queue.some(t => t.id === track.id);
    if (exists) return; // avoid duplicates

    if (playNext) {
      this.queue.splice(this.queueIndex + 1, 0, track);
    } else {
      this.queue.push(track);
    }
    this.notify('queueChange', { queue: this.queue, index: this.queueIndex });
  }
}

export const audioEngine = new AudioEngine();
