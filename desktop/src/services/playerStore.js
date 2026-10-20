// Central State Store for Playback, Liked Songs, Playlists, and Recent Activity
// Persisted in localStorage for seamless sessions

const STORAGE_KEYS = {
  LIKED: 'melo_desktop_liked_songs',
  PLAYLISTS: 'melo_desktop_playlists',
  RECENT: 'melo_desktop_recent_activity',
  SETTINGS: 'melo_desktop_player_settings'
};

class PlayerStore {
  constructor() {
    this.subscribers = new Set();
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
    return { isLiked, message };
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
      description: description || 'Created on MUSE Desktop',
      cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      createdAt: Date.now(),
      tracks: []
    };

    this.playlists.unshift(newPl);
    this.save(STORAGE_KEYS.PLAYLISTS, this.playlists);
    this.notify('playlistsChange', { playlists: this.playlists, newPlaylist: newPl });
    return newPl;
  }

  addTrackToPlaylist(playlistId, track) {
    const pl = this.playlists.find((p) => p.id === playlistId);
    if (!pl || !track) return false;

    // Check duplicate
    if (!pl.tracks.some((t) => t.id === track.id || (t.videoId && t.videoId === track.videoId))) {
      pl.tracks.push(track);
      if (pl.tracks.length === 1 && track.cover) {
        pl.cover = track.cover;
      }
      this.save(STORAGE_KEYS.PLAYLISTS, this.playlists);
      this.notify('playlistsChange', { playlists: this.playlists, updatedPlaylist: pl });
      return true;
    }
    return false;
  }

  removeTrackFromPlaylist(playlistId, trackId) {
    const pl = this.playlists.find((p) => p.id === playlistId);
    if (!pl) return false;

    pl.tracks = pl.tracks.filter((t) => t.id !== trackId && t.videoId !== trackId);
    this.save(STORAGE_KEYS.PLAYLISTS, this.playlists);
    this.notify('playlistsChange', { playlists: this.playlists, updatedPlaylist: pl });
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

    // Keep max 50 recent tracks
    if (this.recentActivity.length > 50) {
      this.recentActivity = this.recentActivity.slice(0, 50);
    }

    this.save(STORAGE_KEYS.RECENT, this.recentActivity);
    this.notify('recentChange', { recentActivity: this.recentActivity });
  }

  clearRecentActivity() {
    this.recentActivity = [];
    this.save(STORAGE_KEYS.RECENT, []);
    this.notify('recentChange', { recentActivity: [] });
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
}

export const playerStore = new PlayerStore();
