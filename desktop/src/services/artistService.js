// Artist Service for MUSE PC (Curated + Worldwide Search)
import { CURATED_ARTISTS } from '../data/curatedArtists.js';
import { resolveApiUrl } from '../config/api.js';

class ArtistService {
  constructor() {
    this.cache = new Map();
  }

  getCuratedArtists() {
    return CURATED_ARTISTS;
  }

  async searchArtistsWorldwide(query) {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    if (this.cache.has(trimmed)) {
      return this.cache.get(trimmed);
    }

    // 1. Primary: Search via backend proxy to Deezer (returns real high-res face portraits)
    try {
      const res = await fetch(resolveApiUrl(`/api/artist-search?q=${encodeURIComponent(trimmed)}`));
      if (res.ok) {
        const data = await res.json();
        if (data.artists && data.artists.length > 0) {
          this.cache.set(trimmed, data.artists);
          return data.artists;
        }
      }
    } catch (err) {
      console.warn('Backend artist search proxy notice:', err);
    }

    // 2. Direct fallback: iTunes search API
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=musicArtist&limit=15`);
      if (res.ok) {
        const data = await res.json();
        const fallbackList = (data.results || []).map(a => ({
          id: `artist-${a.artistId}`,
          name: a.artistName,
          genre: a.primaryGenreName || 'Popular',
          photo: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
          topSongs: []
        }));
        this.cache.set(trimmed, fallbackList);
        return fallbackList;
      }
    } catch (e) {
      console.warn('Fallback artist search failed:', e);
    }

    return [];
  }
}

export const artistService = new ArtistService();
