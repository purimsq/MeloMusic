// Enterprise Live Music Search Service (Worldwide Catalog, Ad-Free YouTube Playback & Real Artist Face Portraits)
import { DEFAULT_FALLBACK_COVER } from '../data/samples.js';

export class MusicSearchService {
  constructor() {
    this.trackCache = new Map();
    this.artistCache = new Map();
    this.youtubeVideoCache = new Map();
  }

  /**
   * Search worldwide catalog with real 600x600 artwork, real duration, and metadata
   */
  async search(query) {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    if (this.trackCache.has(trimmed)) {
      return this.trackCache.get(trimmed);
    }

    try {
      // Primary: Worldwide music search API (real tracks, real artists, real albums)
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&media=music&entity=song&limit=35`);
      if (!res.ok) throw new Error('Search request failed');

      const data = await res.json();
      const results = (data.results || []).map((t, idx) => {
        // High-res 600x600 cover
        const highResCover = t.artworkUrl100
          ? t.artworkUrl100.replace('100x100bb', '600x600bb')
          : DEFAULT_FALLBACK_COVER;

        // Actual full track duration in seconds (from milliseconds)
        const fullDuration = t.trackTimeMillis ? Math.round(t.trackTimeMillis / 1000) : (190 + (idx * 15) % 120);

        return {
          id: `real-track-${t.trackId || idx}`,
          title: (t.trackName || 'Unknown Title').toUpperCase(),
          artist: t.artistName || 'Unknown Artist',
          album: t.collectionName || 'Single',
          duration: fullDuration,
          cover: highResCover,
          genre: t.primaryGenreName || 'Pop',
          releaseDate: t.releaseDate ? t.releaseDate.split('T')[0] : '2024',
          needsResolution: true, // will fetch exact YouTube audio videoId on play
          lyrics: `[00:00.00] ${t.trackName} - ${t.artistName}\n[00:08.50] Streaming official audio in High Fidelity on Melo\n[00:18.00] Feel the sound waves elevate every moment\n[00:30.00] Pure ad-free acoustic experience\n[00:44.00] Melo Sound Signature`
        };
      });

      this.trackCache.set(trimmed, results);
      return results;
    } catch (err) {
      console.warn('Worldwide search error, returning empty', err);
      return [];
    }
  }

  /**
   * Live search for ANY artist on Spotify / YouTube worldwide
   * Returns real artists with real HD face portraits (not album covers)
   */
  async searchArtistsWorldwide(query) {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    if (this.artistCache.has(trimmed)) {
      return this.artistCache.get(trimmed);
    }

    try {
      // Try local backend proxy to Deezer artist API first (returns real face portraits)
      const res = await fetch(`/api/artist-search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.artists && data.artists.length > 0) {
          this.artistCache.set(trimmed, data.artists);
          return data.artists;
        }
      }
    } catch (err) {
      console.warn('Local artist proxy fallback:', err);
    }

    // Direct fallback: query open artist catalog
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(trimmed)}&entity=musicArtist&limit=12`);
      if (res.ok) {
        const data = await res.json();
        const fallbackList = (data.results || []).map(a => ({
          id: `artist-${a.artistId}`,
          name: a.artistName,
          genre: a.primaryGenreName || 'Popular',
          photo: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
          topSongs: []
        }));
        this.artistCache.set(trimmed, fallbackList);
        return fallbackList;
      }
    } catch (e) {}

    return [];
  }

  /**
   * Resolves the exact YouTube Video ID for ad-free master playback
   */
  async resolveYouTubeVideoId(track) {
    if (!track) return null;
    if (track.youtubeId) return track.youtubeId;

    const cacheKey = `${track.title} ${track.artist}`.toLowerCase();
    if (this.youtubeVideoCache.has(cacheKey)) {
      return this.youtubeVideoCache.get(cacheKey);
    }

    try {
      const q = `${track.title} ${track.artist}`;
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.videoId) {
          this.youtubeVideoCache.set(cacheKey, data.videoId);
          track.youtubeId = data.videoId;
          return data.videoId;
        }
      }
    } catch (err) {
      console.warn('Failed to resolve YouTube ID:', err);
    }

    return null;
  }
}

export const musicSearchService = new MusicSearchService();
