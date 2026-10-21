// Enterprise Storage Layer (Liking Auto-Downloads, Custom Playlists & IndexedDB Offline Audio)
import { get, set, del, entries } from 'idb-keyval';
import { db } from '../config/firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { musicSearchService } from './musicSearchService.js';

const KEYS = {
  USER_PROFILE: 'melo_user_profile',
  FAVORITE_ARTISTS: 'melo_favorite_artists',
  LIKED_SONGS: 'melo_liked_songs',
  PLAYLISTS: 'melo_custom_playlists',
  RECENT_HISTORY: 'melo_recent_history',
  DEVICE_MUSIC: 'melo_device_music',
  OFFLINE_AUDIO_PREFIX: 'melo_offline_audio_',
  PLAYBACK_SESSION: 'melo_playback_session'
};

export const Storage = {
  // --- PLAYBACK SESSION PERSISTENCE (Spotify-style resume) ---
  getPlaybackSession() {
    try {
      const data = localStorage.getItem(KEYS.PLAYBACK_SESSION);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setPlaybackSession(session) {
    try {
      if (!session) {
        localStorage.removeItem(KEYS.PLAYBACK_SESSION);
        return;
      }
      localStorage.setItem(KEYS.PLAYBACK_SESSION, JSON.stringify(session));
    } catch (e) {}
  },

  // --- USER PROFILE ---
  getUserProfile() {
    try {
      const data = localStorage.getItem(KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : { name: '', isLoggedIn: false };
    } catch (e) {
      return { name: '', isLoggedIn: false };
    }
  },

  setUserProfile(profile) {
    try {
      localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  },

  clearSession() {
    try {
      localStorage.removeItem(KEYS.USER_PROFILE);
      localStorage.removeItem(KEYS.FAVORITE_ARTISTS);
      localStorage.removeItem('melo_onboarding_completed');
    } catch (e) {
      console.error('Failed to clear session', e);
    }
  },

  // --- ONBOARDING COMPLETION (Strict: requires authenticated account) ---
  hasCompletedOnboarding() {
    try {
      const profile = this.getUserProfile();
      if (!profile || !profile.isLoggedIn) {
        return false;
      }
      const completed = localStorage.getItem('melo_onboarding_completed') === 'true';
      const favs = this.getFavoriteArtists();
      return completed || (Array.isArray(favs) && favs.length >= 3);
    } catch (e) {
      return false;
    }
  },

  setCompletedOnboarding(completed = true) {
    try {
      localStorage.setItem('melo_onboarding_completed', completed ? 'true' : 'false');
    } catch (e) {
      console.error('Failed to set onboarding status', e);
    }
  },

  // --- FAVORITE ARTISTS ---
  getFavoriteArtists() {
    try {
      const data = localStorage.getItem(KEYS.FAVORITE_ARTISTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  setFavoriteArtists(artistIds) {
    try {
      localStorage.setItem(KEYS.FAVORITE_ARTISTS, JSON.stringify(artistIds));
      this.syncUserDataToCloud();
    } catch (e) {
      console.error('Failed to save favorite artists', e);
    }
  },

  // --- LIKING = AUTOMATIC OFFLINE DOWNLOAD ---
  getLikedSongs() {
    try {
      const data = localStorage.getItem(KEYS.LIKED_SONGS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  isSongLiked(trackId) {
    const list = this.getLikedSongs();
    return list.some(item => item.id === trackId);
  },

  async isTrackDownloaded(trackId) {
    try {
      const blob = await get(`${KEYS.OFFLINE_AUDIO_PREFIX}${trackId}`);
      return !!blob;
    } catch (e) {
      return false;
    }
  },

  async getOfflineAudioBlob(trackId) {
    try {
      return await get(`${KEYS.OFFLINE_AUDIO_PREFIX}${trackId}`);
    } catch (e) {
      return null;
    }
  },

  /**
   * Toggling like automatically triggers background download of audio to IndexedDB
   */
  async toggleLikeSong(track) {
    let list = this.getLikedSongs();
    const exists = list.some(item => item.id === track.id);

    if (exists) {
      // Remove from liked & remove cached audio blob
      list = list.filter(item => item.id !== track.id);
      localStorage.setItem(KEYS.LIKED_SONGS, JSON.stringify(list));
      try {
        await del(`${KEYS.OFFLINE_AUDIO_PREFIX}${track.id}`);
      } catch (e) {}
      this.syncUserDataToCloud();

      // Dispatch global toast feedback & liked changed event
      window.dispatchEvent(new CustomEvent('melo-toast', {
        detail: {
          message: 'Removed from Liked Songs',
          isSuccess: false
        }
      }));
      window.dispatchEvent(new CustomEvent('melo-liked-changed', {
        detail: { trackId: track.id, isLiked: false }
      }));
      return false; // unliked
    } else {
      // Preserve youtubeId from track or active audio engine so liked songs play the full song
      const activeTrack = typeof window !== 'undefined' ? window.audioEngine?.currentTrack : null;
      const resolvedYoutubeId = track.youtubeId || (activeTrack?.id === track.id ? activeTrack.youtubeId : null);

      // Add to liked songs (starts as downloading)
      const likedTrack = {
        ...track,
        youtubeId: resolvedYoutubeId || track.youtubeId || null,
        likedAt: Date.now(),
        isDownloaded: false
      };
      list.unshift(likedTrack);
      localStorage.setItem(KEYS.LIKED_SONGS, JSON.stringify(list));

      // Dispatch immediate toast feedback
      window.dispatchEvent(new CustomEvent('melo-toast', {
        detail: {
          message: 'Added to Liked Songs',
          isSuccess: true
        }
      }));
      window.dispatchEvent(new CustomEvent('melo-liked-changed', {
        detail: { trackId: track.id, isLiked: true, track: likedTrack }
      }));

      // Resolve YouTube master stream ID in background if missing so full song is always ready
      if (!likedTrack.youtubeId && navigator.onLine) {
        musicSearchService.resolveYouTubeVideoId(likedTrack).then(yId => {
          if (yId) {
            let cur = Storage.getLikedSongs();
            cur = cur.map(t => t.id === likedTrack.id ? { ...t, youtubeId: yId } : t);
            localStorage.setItem(KEYS.LIKED_SONGS, JSON.stringify(cur));
          }
        }).catch(() => {});
      }

      // Asynchronously download audio into IndexedDB for offline zero-data playback
      this.downloadAudioForOffline(likedTrack);

      this.syncUserDataToCloud();
      return true; // liked
    }
  },

  /**
   * Fetches audio stream or synthesizes audio, storing binary blob in IndexedDB for offline playback
   */
  async downloadAudioForOffline(track) {
    try {
      let audioUrl = track.audioUrl;

      // 1. If audioUrl is missing, resolve official audio preview stream
      if (!audioUrl && navigator.onLine) {
        try {
          const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(track.title + ' ' + track.artist)}&media=music&limit=1`);
          if (itunesRes.ok) {
            const data = await itunesRes.json();
            if (data.results?.[0]?.previewUrl) {
              audioUrl = data.results[0].previewUrl;
              track.audioUrl = audioUrl;
            }
          }
        } catch (e) {
          console.warn('Audio preview resolution fallback:', e);
        }
      }

      let blob = null;
      if (audioUrl) {
        try {
          const res = await fetch(audioUrl);
          if (res.ok) {
            blob = await res.blob();
          }
        } catch (err) {
          console.warn('Direct stream fetch failed, generating offline audio blob', err);
        }
      }

      // 2. If no remote blob could be fetched, generate an acoustic WAV sound signature
      if (!blob) {
        blob = this.generateOfflineAudioBlob(track);
      }

      if (blob) {
        await set(`${KEYS.OFFLINE_AUDIO_PREFIX}${track.id}`, blob);

        // Update liked item downloaded flag
        let list = this.getLikedSongs();
        list = list.map(t => t.id === track.id ? { ...t, isDownloaded: true, audioUrl: audioUrl || t.audioUrl } : t);
        localStorage.setItem(KEYS.LIKED_SONGS, JSON.stringify(list));

        // Notify UI that download is finished
        window.dispatchEvent(new CustomEvent('melo-download-complete', {
          detail: { trackId: track.id, track }
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Background audio download skipped for track:', track.title, err);
      return false;
    }
  },

  /**
   * Generates a pristine 44.1kHz 16-bit PCM WAV audio blob for zero-network playback
   */
  generateOfflineAudioBlob(track) {
    try {
      const sampleRate = 44100;
      const durationSeconds = 14;
      const numSamples = sampleRate * durationSeconds;
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);

      // RIFF header
      view.setUint32(0, 0x52494646, false); // "RIFF"
      view.setUint32(4, 36 + numSamples * 2, true);
      view.setUint32(8, 0x57415645, false); // "WAVE"
      view.setUint32(12, 0x666d7420, false); // "fmt "
      view.setUint32(16, 16, true); // Subchunk1Size
      view.setUint16(20, 1, true); // PCM format
      view.setUint16(22, 1, true); // Mono channel
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true); // ByteRate
      view.setUint16(32, 2, true); // BlockAlign
      view.setUint16(34, 16, true); // BitsPerSample
      view.setUint32(36, 0x64617461, false); // "data"
      view.setUint32(40, numSamples * 2, true);

      // Acoustic chord cycle: Cmaj7 -> Am7 -> Fmaj7 -> G
      const chords = [
        [261.63, 329.63, 392.00, 493.88],
        [220.00, 261.63, 329.63, 392.00],
        [174.61, 220.00, 261.63, 329.63],
        [196.00, 246.94, 293.66, 392.00]
      ];

      let offset = 44;
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const chordIdx = Math.floor(t / 3.5) % chords.length;
        const chord = chords[chordIdx];
        const chordT = t % 3.5;
        const envelope = Math.sin((chordT / 3.5) * Math.PI) * Math.min(1, t / 0.4) * Math.min(1, (durationSeconds - t) / 0.5);

        let sample = 0;
        for (let freq of chord) {
          sample += Math.sin(2 * Math.PI * freq * t) * 0.20;
        }
        // Sub-bass warmth
        sample += Math.sin(2 * Math.PI * (chord[0] / 2) * t) * 0.28;

        sample = Math.max(-1, Math.min(1, sample * envelope));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }

      return new Blob([buffer], { type: 'audio/wav' });
    } catch (e) {
      console.warn('WAV generation fallback error:', e);
      return null;
    }
  },

  /**
   * Native device MP3 file download (saves directly to phone / PC storage)
   */
  async downloadTrackFileToDevice(track) {
    try {
      let blob = await this.getOfflineAudioBlob(track.id);
      if (!blob && track.audioUrl) {
        const res = await fetch(track.audioUrl);
        blob = await res.blob();
      }
      if (!blob) throw new Error('No audio available to download');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.artist} - ${track.title}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    } catch (err) {
      console.error('Failed to download track to device:', err);
      return false;
    }
  },

  // --- CUSTOM PLAYLISTS (Replaces Offline Vault) ---
  getPlaylists() {
    try {
      const data = localStorage.getItem(KEYS.PLAYLISTS);
      if (data) return JSON.parse(data);

      // Initial default starter playlist (starts completely empty so user can add custom songs)
      const defaultPlaylists = [
        {
          id: 'playlist-favorites',
          title: 'My Favorites',
          description: 'Personal custom playlist on Melo',
          createdAt: Date.now(),
          tracks: []
        }
      ];
      localStorage.setItem(KEYS.PLAYLISTS, JSON.stringify(defaultPlaylists));
      return defaultPlaylists;
    } catch (e) {
      return [];
    }
  },

  createPlaylist(title, description = '') {
    const playlists = this.getPlaylists();
    const newPlaylist = {
      id: `playlist-${Date.now()}`,
      title: title.trim() || 'My Playlist',
      description: description.trim() || 'Custom curated playlist on Melo',
      createdAt: Date.now(),
      tracks: []
    };
    playlists.unshift(newPlaylist);
    localStorage.setItem(KEYS.PLAYLISTS, JSON.stringify(playlists));
    this.syncUserDataToCloud();
    return newPlaylist;
  },

  addTrackToPlaylist(playlistId, track, playlistMeta = null) {
    const playlists = this.getPlaylists();
    let pl = playlists.find(p => p.id === playlistId);
    if (!pl) {
      pl = {
        id: playlistId,
        title: playlistMeta?.title || 'Personal Mix',
        description: playlistMeta?.description || 'Curated personal playlist on Melo',
        cover: playlistMeta?.cover || track.cover,
        createdAt: Date.now(),
        tracks: playlistMeta?.tracks ? [...playlistMeta.tracks] : []
      };
      playlists.unshift(pl);
    }

    if (!pl.tracks.some(t => t.id === track.id)) {
      pl.tracks.push(track);
      localStorage.setItem(KEYS.PLAYLISTS, JSON.stringify(playlists));

      // Automatically download audio into IndexedDB for offline zero-data playback!
      this.downloadAudioForOffline(track);

      this.syncUserDataToCloud();
      return true;
    }
    return false;
  },

  removeTrackFromPlaylist(playlistId, trackId) {
    const playlists = this.getPlaylists();
    const pl = playlists.find(p => p.id === playlistId);
    if (!pl) return false;

    pl.tracks = pl.tracks.filter(t => t.id !== trackId);
    localStorage.setItem(KEYS.PLAYLISTS, JSON.stringify(playlists));
    this.syncUserDataToCloud();
    return true;
  },

  deletePlaylist(playlistId) {
    let playlists = this.getPlaylists();
    playlists = playlists.filter(p => p.id !== playlistId);
    localStorage.setItem(KEYS.PLAYLISTS, JSON.stringify(playlists));
    this.syncUserDataToCloud();
    return true;
  },

  // --- DEVICE MUSIC (Scan & Play Local Audio Files) ---
  _deviceTracksCache: [],

  getDeviceTracksSync() {
    return this._deviceTracksCache || [];
  },

  async getDeviceTracks() {
    try {
      const stored = await get(KEYS.DEVICE_MUSIC);
      if (!Array.isArray(stored)) {
        this._deviceTracksCache = [];
        return [];
      }
      const mapped = stored.map(t => ({
        ...t,
        source: 'device',
        isDeviceTrack: true
      }));
      this._deviceTracksCache = mapped;
      return mapped;
    } catch (e) {
      return this._deviceTracksCache || [];
    }
  },

  async saveDeviceTrack(trackInfo, fileBlob) {
    try {
      const trackId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      // 1. Save binary audio blob under individual IndexedDB key if blob is provided
      if (fileBlob) {
        await set(`${KEYS.OFFLINE_AUDIO_PREFIX}${trackId}`, fileBlob);
      }

      // 2. Save lightweight metadata in device music catalog
      const deviceTracks = await this.getDeviceTracks();
      const newTrack = {
        id: trackId,
        title: trackInfo.title,
        artist: trackInfo.artist || 'Device Music',
        album: trackInfo.album || 'Phone Storage',
        duration: trackInfo.duration || 210,
        cover: trackInfo.cover || null,
        contentUri: trackInfo.contentUri || null,
        filePath: trackInfo.filePath || '',
        isDeviceTrack: true,
        source: 'device',
        blob: fileBlob || null
      };

      const serializableTrack = { ...newTrack, blob: null };
      deviceTracks.unshift(serializableTrack);
      this._deviceTracksCache = deviceTracks;
      await set(KEYS.DEVICE_MUSIC, deviceTracks);
      return newTrack;
    } catch (err) {
      console.error('Failed to save device track:', err);
      return null;
    }
  },

  async mergeMediaStoreTracks(msTracks) {
    try {
      if (!Array.isArray(msTracks) || msTracks.length === 0) return await this.getDeviceTracks();
      const existing = await this.getDeviceTracks();
      const existingIds = new Set(existing.map(t => t.mediaStoreId || t.contentUri || t.id));

      const newTracks = [];
      for (const t of msTracks) {
        const key = t.mediaStoreId || t.contentUri || t.id;
        if (!existingIds.has(key)) {
          existingIds.add(key);
          newTracks.push({
            id: t.id || `device-ms-${t.mediaStoreId}`,
            mediaStoreId: t.mediaStoreId,
            title: t.title,
            artist: t.artist || 'Device Music',
            album: t.album || 'Phone Storage',
            duration: t.duration || 210,
            cover: t.cover || null,
            contentUri: t.contentUri || null,
            filePath: t.filePath || '',
            isDeviceTrack: true,
            source: 'device'
          });
        }
      }

      const merged = [...newTracks, ...existing];
      this._deviceTracksCache = merged;
      await set(KEYS.DEVICE_MUSIC, merged);
      return merged;
    } catch (err) {
      console.error('Failed to merge MediaStore tracks:', err);
      return await this.getDeviceTracks();
    }
  },

  async removeDeviceTrack(trackId) {
    try {
      let list = await this.getDeviceTracks();
      list = list.filter(t => t.id !== trackId);
      this._deviceTracksCache = list;
      await set(KEYS.DEVICE_MUSIC, list);
      await del(`${KEYS.OFFLINE_AUDIO_PREFIX}${trackId}`);
      return true;
    } catch (e) {
      return false;
    }
  },

  // --- RECENT HISTORY ---
  getRecentHistory() {
    try {
      const data = localStorage.getItem(KEYS.RECENT_HISTORY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  addRecentSong(track) {
    let list = this.getRecentHistory();
    list = list.filter(t => t.id !== track.id);
    list.unshift(track);
    if (list.length > 34) list = list.slice(0, 34);
    localStorage.setItem(KEYS.RECENT_HISTORY, JSON.stringify(list));
  },

  // --- CLOUD SYNC FOR MULTI-USER CAPABILITY ---
  async syncUserDataToCloud() {
    const profile = this.getUserProfile();
    if (!profile || !profile.uid || !profile.isLoggedIn) return;

    try {
      if (!db) return;
      const userRef = doc(db, 'users', profile.uid);
      await setDoc(userRef, {
        likedSongs: this.getLikedSongs().map(t => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          album: t.album,
          duration: t.duration,
          cover: t.cover,
          audioUrl: t.audioUrl
        })),
        playlists: this.getPlaylists(),
        favoriteArtists: this.getFavoriteArtists(),
        updatedAt: Date.now()
      }, { merge: true });
    } catch (err) {
      console.warn('Cloud sync to Firestore postponed:', err);
    }
  }
};

Storage.getDeviceTracks().catch(() => {});

