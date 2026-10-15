// Enterprise storage layer for Melo with offline IndexedDB and LocalStorage fallback
import { get, set, del, entries } from 'idb-keyval';

const KEYS = {
  USER_PROFILE: 'melo_user_profile',
  FAVORITE_ARTISTS: 'melo_favorite_artists',
  LIKED_SONGS: 'melo_liked_songs',
  OFFLINE_VAULT: 'melo_offline_vault_',
  RECENT_HISTORY: 'melo_recent_history',
  PLAYLISTS: 'melo_playlists'
};

export const Storage = {
  // User Profile
  getUserProfile() {
    try {
      const data = localStorage.getItem(KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setUserProfile(profile) {
    try {
      localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to save profile', e);
    }
  },

  // Favorite Artists
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
    } catch (e) {
      console.error('Failed to save favorite artists', e);
    }
  },

  // Liked Songs
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

  toggleLikeSong(track) {
    let list = this.getLikedSongs();
    const exists = list.some(item => item.id === track.id);
    if (exists) {
      list = list.filter(item => item.id !== track.id);
    } else {
      list.unshift(track);
    }
    localStorage.setItem(KEYS.LIKED_SONGS, JSON.stringify(list));
    return !exists;
  },

  // Recent History (max 50, strictly deduplicated)
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
    if (list.length > 50) list = list.slice(0, 50);
    localStorage.setItem(KEYS.RECENT_HISTORY, JSON.stringify(list));
  },

  // Offline Vault (Audio Blobs stored in IndexedDB)
  async saveToVault(track, audioBlob = null) {
    try {
      const vaultItem = {
        ...track,
        savedAt: Date.now(),
        blob: audioBlob
      };
      await set(`${KEYS.OFFLINE_VAULT}${track.id}`, vaultItem);
      return true;
    } catch (err) {
      console.error('Failed to save track to IndexedDB vault', err);
      return false;
    }
  },

  async isTrackInVault(trackId) {
    try {
      const item = await get(`${KEYS.OFFLINE_VAULT}${trackId}`);
      return !!item;
    } catch (err) {
      return false;
    }
  },

  async getVaultTracks() {
    try {
      const allEntries = await entries();
      return allEntries
        .filter(([key]) => String(key).startsWith(KEYS.OFFLINE_VAULT))
        .map(([, value]) => value);
    } catch (err) {
      console.error('Failed to get vault tracks', err);
      return [];
    }
  },

  async removeFromVault(trackId) {
    try {
      await del(`${KEYS.OFFLINE_VAULT}${trackId}`);
      return true;
    } catch (err) {
      return false;
    }
  }
};
