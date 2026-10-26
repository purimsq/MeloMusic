// Central State Store for Playback, Liked Songs, Playlists, and Recent Activity
// Persisted in localStorage and synchronized with Firebase Firestore when logged in
import { auth, db } from './firebase.js';
import { doc, setDoc } from 'firebase/firestore';

const STORAGE_KEYS = {
  LIKED: 'melo_desktop_liked_songs',
  PLAYLISTS: 'melo_desktop_playlists',
  RECENT: 'melo_desktop_recent_activity',
  SETTINGS: 'melo_desktop_player_settings'
};

class PlayerStore {
  constructor() {
    this.subscribers = new Set();
    this.cloudSyncTimer = null;
    this.likedSongs = this.load(STORAGE_KEYS.LIKED, []);
    this.playlists = this.load(STORAGE_KEYS.PLAYLISTS, [
      {
        id: 'pl-favorites',
        title: 'Late Night Chill & Vibe',
        description: 'Atmospheric evening jams and chill visualizers.',
        cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=600&q=80',
        tracks: []
      },
      {
        id: 'pl-focus',
        title: 'Deep Focus & Flow',
        description: 'Instrumental rhythms for intense concentration.',
        cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
        tracks: []
      }
    ]);
    this.recentActivity = this.load(STORAGE_KEYS.RECENT, []);
    this.settings = this.load(STORAGE_KEYS.SETTINGS, {
      volume: 0.85,
      isMuted: false,
      playerMode: 'song', // 'song' by default | 'video'
      repeatMode: 'all', // 'off' | 'all' | 'one'
      isShuffle: false
    });
  }

  load(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  }

  save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('Storage save error:', e);
    }
  }

  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  notify(eventType, payload) {
    this.subscribers.forEach((fn) => {
      try {
        fn(eventType, payload);
      } catch (e) {
        console.error('Subscriber error:', e);
      }
    });
  }

  // LIKED SONGS
  getLikedSongs() {
    return [...this.likedSongs];
  }

  isLiked(trackId) {
    if (!trackId) return false;
    return this.likedSongs.some((t) => t.id === trackId || (t.videoId && t.videoId === trackId));
  }

  toggleLike(track) {
    if (!track) return { isLiked: false, message: '' };

    const existsIndex = this.likedSongs.findIndex(
      (t) => t.id === track.id || (t.videoId && track.videoId && t.videoId === track.videoId)
    );

    let isLiked = false;
    let message = '';

    if (existsIndex >= 0) {
      this.likedSongs.splice(existsIndex, 1);
      isLiked = false;
      message = `Removed "${track.title}" from Liked Songs`;
    } else {
      this.likedSongs.unshift({
        ...track,
        likedAt: Date.now()
      });
      isLiked = true;
      message = `Added "${track.title}" to Liked Songs`;
    }

    this.save(STORAGE_KEYS.LIKED, this.likedSongs);
    this.notify('likedChange', { track, isLiked, message, count: this.likedSongs.length });
    this.scheduleCloudSync();
    return { isLiked, message };
  }

  // Cloud restoration methods (invoked on login / session sync)
  setLikedSongsFromCloud(tracks) {
    if (!Array.isArray(tracks)) return;
    this.likedSongs = tracks;
    this.save(STORAGE_KEYS.LIKED, tracks);
    this.notify('likedChange', { count: tracks.length });
  }

  setPlaylistsFromCloud(playlists) {
    if (!Array.isArray(playlists)) return;
    this.playlists = playlists;
    this.save(STORAGE_KEYS.PLAYLISTS, playlists);
    this.notify('playlistsChange', { playlists });
  }

  setRecentActivityFromCloud(recent) {
    if (!Array.isArray(recent)) return;
    const capped = recent.slice(0, 34);
    this.recentActivity = capped;
    this.save(STORAGE_KEYS.RECENT, capped);
    this.notify('recentChange', { recentActivity: capped });
  }

  scheduleCloudSync() {
    if (this.cloudSyncTimer) clearTimeout(this.cloudSyncTimer);
    this.cloudSyncTimer = setTimeout(() => {
      this.syncToCloud();
    }, 400);
  }

  async syncToCloud() {
    try {
      const user = auth?.currentUser;
      if (!user || !db) return;
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          likedSongs: this.likedSongs.map((t) => ({
            id: t.id,
            videoId: t.videoId || t.id,
            title: t.title || '',
            artist: t.artist || '',
            album: t.album || '',
            duration: t.duration || 0,
            durationFormatted: t.durationFormatted || '3:30',
            cover: t.cover || '',
            likedAt: t.likedAt || Date.now()
          })),
          playlists: this.playlists,
          // FIFO: Persist strictly the latest 34 tracks to prevent database bloating
          recentActivity: this.recentActivity.slice(0, 34).map((t) => ({
            id: t.id,
            videoId: t.videoId || t.id,
            title: t.title || '',
            artist: t.artist || '',
            album: t.album || '',
            duration: t.duration || 0,
            durationFormatted: t.durationFormatted || '3:30',
            cover: t.cover || '',
            playedAt: t.playedAt || Date.now()
          })),
          updatedAt: Date.now()
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('playerStore cloud sync notice:', e);
    }
  }

  // PLAYLISTS
  getPlaylists() {
    return [...this.playlists];
  }

  getPlaylist(playlistId) {
    return this.playlists.find((p) => p.id === playlistId) || null;
  }

  createPlaylist(title, description = '') {
    const trimmedTitle = (title || 'New Playlist').trim();
    const newPl = {
      id: `pl-${Date.now()}`,
      title: trimmedTitle,
      description: description || 'Created on MELO Desktop',
      cover: '',
      createdAt: Date.now(),
      tracks: []
    };

    this.playlists.unshift(newPl);
    this.save(STORAGE_KEYS.PLAYLISTS, this.playlists);
    this.notify('playlistsChange', { playlists: this.playlists, newPlaylist: newPl });
    this.scheduleCloudSync();
    return newPl;
  }

  addTrackToPlaylist(playlistId, track) {
    const pl = this.playlists.find((p) => p.id === playlistId);
    if (!pl || !track) return false;

    // Check duplicate
    if (!pl.tracks.some((t) => t.id === track.id || (t.videoId && t.videoId === track.videoId))) {
      pl.tracks.push(track);
      if (track.cover && (!pl.cover || pl.cover.includes('unsplash'))) {
        pl.cover = track.cover;
      }
      this.save(STORAGE_KEYS.PLAYLISTS, this.playlists);
      this.notify('playlistsChange', { playlists: this.playlists, updatedPlaylist: pl });
      this.scheduleCloudSync();
      return true;
    }
    return false;
  }

  removeTrackFromPlaylist(playlistId, trackId) {
    const pl = this.playlists.find((p) => p.id === playlistId);
    if (!pl) return false;

    pl.tracks = pl.tracks.filter((t) => t.id !== trackId && t.videoId !== trackId);
    if (pl.tracks.length === 0) {
      pl.cover = '';
    } else if (pl.tracks[0]?.cover) {
      pl.cover = pl.tracks[0].cover;
    }
    this.save(STORAGE_KEYS.PLAYLISTS, this.playlists);
    this.notify('playlistsChange', { playlists: this.playlists, updatedPlaylist: pl });
    this.scheduleCloudSync();
    return true;
  }

  deletePlaylist(playlistId) {
    this.playlists = this.playlists.filter((p) => p.id !== playlistId);
    this.save(STORAGE_KEYS.PLAYLISTS, this.playlists);
    this.notify('playlistsChange', { playlists: this.playlists });
    this.scheduleCloudSync();
    return true;
  }

  // RECENT ACTIVITY
  getRecentActivity() {
    return [...this.recentActivity];
  }

  recordRecentTrack(track) {
    if (!track || !track.title) return;

    // Filter out existing instance
    this.recentActivity = this.recentActivity.filter(
      (t) => t.id !== track.id && (!track.videoId || t.videoId !== track.videoId)
    );

    // Prepend new record
    this.recentActivity.unshift({
      ...track,
      playedAt: Date.now()
    });

    // FIFO: Keep strictly the last 34 tracks; older tracks beyond 34 are automatically removed
    if (this.recentActivity.length > 34) {
      this.recentActivity = this.recentActivity.slice(0, 34);
    }

    this.save(STORAGE_KEYS.RECENT, this.recentActivity);
    this.notify('recentChange', { recentActivity: this.recentActivity });
    this.scheduleCloudSync();
  }

  clearRecentActivity() {
    this.recentActivity = [];
    this.save(STORAGE_KEYS.RECENT, []);
    this.notify('recentChange', { recentActivity: [] });
    this.scheduleCloudSync();
  }

  // SETTINGS
  getSettings() {
    return { ...this.settings };
  }

  updateSettings(updates) {
    this.settings = { ...this.settings, ...updates };
    this.save(STORAGE_KEYS.SETTINGS, this.settings);
    this.notify('settingsChange', this.settings);
  }

  // PLAYBACK SESSION PERSISTENCE (Spotify-style restore on launch / after sudden exit)
  getPlaybackSession() {
    return this.load('melo_desktop_playback_session', null);
  }

  savePlaybackSession(session) {
    if (!session || !session.currentTrack) return;
    this.save('melo_desktop_playback_session', session);
  }
}

export const playerStore = new PlayerStore();
