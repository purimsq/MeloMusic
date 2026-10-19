import { DEFAULT_FALLBACK_COVER } from '../data/samples.js';

const artworkMemoryCache = new Map();

/**
 * Resolves a track's artwork URL safely for WebView display.
 * Prevents raw content:// URIs from breaking <img> rendering in WebView.
 * Utilizes AndroidMusicBridge.getAlbumArt for scoped storage thumbnail extraction on Android 10+.
 */
export function getTrackArtworkUrl(track) {
  if (!track) return DEFAULT_FALLBACK_COVER;

  // 1. Check in-memory cache
  if (artworkMemoryCache.has(track.id)) {
    return artworkMemoryCache.get(track.id);
  }

  const rawCover = track.cover;

  // 2. Standard web/http/https or base64 data URL
  if (rawCover && (rawCover.startsWith('http://') || rawCover.startsWith('https://') || rawCover.startsWith('data:'))) {
    artworkMemoryCache.set(track.id, rawCover);
    return rawCover;
  }

  // 3. Android Native Bridge for ContentResolver Scoped Storage Extraction
  if (typeof window !== 'undefined' && window.AndroidMusicBridge && typeof window.AndroidMusicBridge.getAlbumArt === 'function') {
    const trackId = track.mediaStoreId || 0;
    const albumId = track.albumId || 0;
    if (trackId > 0 || albumId > 0) {
      try {
        const b64 = window.AndroidMusicBridge.getAlbumArt(trackId, albumId);
        if (b64 && b64.startsWith('data:image/')) {
          artworkMemoryCache.set(track.id, b64);
          track.cover = b64;
          return b64;
        }
      } catch (e) {
        console.warn('Native getAlbumArt error:', e);
      }
    }
  }

  // 4. Safe consistent fallback cover
  return DEFAULT_FALLBACK_COVER;
}

export function clearArtworkCache() {
  artworkMemoryCache.clear();
}
