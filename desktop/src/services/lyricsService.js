/**
 * Lyrics Service for MELO / MUSE PC
 * High-performance, multi-tier synchronized lyrics engine.
 *
 * Tier 1: LRCLIB (100% free, synchronized karaoke LRC with millisecond timestamps)
 * Tier 2: LRCLIB Search (fuzzy match with duration validation)
 * Tier 3: YouTube Music InnerTube Official Lyrics (licensed Musixmatch/LyricFind text)
 * Tier 4: YouTube TimedText CC Captions (for videos with manual caption tracks)
 * Tier 5: Clean graceful fallback ('none')
 */

import { youtubeMusicService } from './youtubeMusicService.js';

class LyricsService {
  constructor() {
    this.cache = new Map();
    this.activeRequests = new Map();
  }

  /**
   * Sanitizes YouTube title and artist clutter to maximize lyric matching
   */
  cleanTrackMeta(rawTitle = '', rawArtist = '') {
    let title = String(rawTitle || '').trim();
    let artist = String(rawArtist || '').trim();

    // Remove common YouTube clutter tags
    title = title
      .replace(/\(Official\s+(Music\s+)?(Video|Audio|Visualizer|Lyric\s+Video|Video\s+Official|Track)\)/gi, '')
      .replace(/\[Official\s+(Music\s+)?(Video|Audio|Visualizer|Lyric\s+Video|Track)\]/gi, '')
      .replace(/\(Audio\)/gi, '')
      .replace(/\[Audio\]/gi, '')
      .replace(/\(Visualizer\)/gi, '')
      .replace(/\[Visualizer\]/gi, '')
      .replace(/\(Official\)/gi, '')
      .replace(/\[Official\]/gi, '')
      .replace(/\(Lyrics?\)/gi, '')
      .replace(/\[Lyrics?\]/gi, '')
      .replace(/\(Lyric\s+Video\)/gi, '')
      .replace(/\[Lyric\s+Video\]/gi, '')
      .replace(/\(4K|HD|HQ|1080p|720p\)/gi, '')
      .replace(/\[4K|HD|HQ|1080p|720p\]/gi, '')
      .replace(/\(Explicit\)/gi, '')
      .replace(/\[Explicit\]/gi, '')
      .replace(/\|?\s*Official\s*Music\s*Video/gi, '')
      .replace(/\|?\s*Official\s*Video/gi, '')
      .replace(/\|?\s*Official\s*Audio/gi, '')
      .replace(/\(feat\..*?\)/gi, '')
      .replace(/\[feat\..*?\]/gi, '')
      .replace(/\(ft\..*?\)/gi, '')
      .replace(/\[ft\..*?\]/gi, '')
      .replace(/["“”]/g, '')
      .trim();

    // If title has "Artist - Song Title", split them cleanly
    if (title.includes(' - ') && (!artist || artist === 'Featured Artist' || artist.toLowerCase() === 'official' || artist.toLowerCase().includes('topic'))) {
      const parts = title.split(' - ');
      artist = parts[0].trim();
      title = parts.slice(1).join(' - ').trim();
    }

    // If title starts with artist name like "The Weeknd - Blinding Lights"
    if (artist && title.toLowerCase().startsWith(artist.toLowerCase() + ' - ')) {
      title = title.slice(artist.length + 3).trim();
    }

    // Strip trailing dashes or slashes
    title = title.replace(/[-–—/]\s*$/, '').trim();

    return { title, artist };
  }

  /**
   * Parses standard LRC string into array of timestamped lines: [{ time: seconds, text: string }]
   */
  parseLRC(lrcString) {
    if (!lrcString || typeof lrcString !== 'string') return [];
    const lines = [];
    const timeRegex = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;

    const rawLines = lrcString.split(/\r?\n/);
    for (const raw of rawLines) {
      // Ignore metadata tags like [ar: ...], [ti: ...], [al: ...]
      if (/^\[(ti|ar|al|by|offset|length):/i.test(raw)) continue;

      timeRegex.lastIndex = 0;
      const match = timeRegex.exec(raw);
      if (!match) continue;

      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const msStr = match[3] || '0';
      const ms = msStr.length === 2 ? parseInt(msStr, 10) * 10 : parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
      const totalSeconds = min * 60 + sec + ms / 1000;

      const text = raw.replace(timeRegex, '').trim();
      if (text) {
        lines.push({
          time: Math.round(totalSeconds * 100) / 100,
          text
        });
      }
    }

    lines.sort((a, b) => a.time - b.time);
    return lines;
  }

  /**
   * Fetches lyrics using multi-tier engine with caching and race-condition safety
   */
  async getLyrics(track) {
    if (!track) return { type: 'none', message: 'No track playing' };

    const videoId = track.videoId || track.youtubeId || (typeof track.id === 'string' && track.id.startsWith('yt-') ? track.id.replace('yt-', '') : track.id);
    const cacheKey = videoId || `${track.artist}_${track.title}`.toLowerCase();

    // Check memory cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Deduplicate in-flight requests for the exact same track
    if (this.activeRequests.has(cacheKey)) {
      return this.activeRequests.get(cacheKey);
    }

    const fetchPromise = (async () => {
      try {
        const { title, artist } = this.cleanTrackMeta(track.title, track.artist);
        const durationSec = Math.round(Number(track.duration) || 0);

        // ====================================================================
        // TIER 1: LRCLIB Direct Get (Exact match by track, artist, duration)
        // ====================================================================
        if (title) {
          try {
            const params = new URLSearchParams({
              track_name: title,
              artist_name: artist || ''
            });
            if (durationSec > 0) {
              params.append('duration', String(durationSec));
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const res = await fetch(`https://lrclib.net/api/get?${params}`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
              const data = await res.json();
              if (data.syncedLyrics) {
                const lines = this.parseLRC(data.syncedLyrics);
                if (lines.length > 0) {
                  const result = {
                    type: 'synced',
                    isSynced: true,
                    lines,
                    provider: 'Muse',
                    source: 'Synced Karaoke Lyrics'
                  };
                  this.cache.set(cacheKey, result);
                  return result;
                }
              }
              if (data.plainLyrics && data.plainLyrics.trim().length > 0) {
                const result = {
                  type: 'plain',
                  isSynced: false,
                  plainText: data.plainLyrics.trim(),
                  provider: 'Muse',
                  source: 'Official Lyrics'
                };
                this.cache.set(cacheKey, result);
                return result;
              }
            }
          } catch (e) {
            // Abort or network hiccup, seamlessly continue to Tier 2
          }
        }

        // ====================================================================
        // TIER 2: LRCLIB Search Fallback (Fuzzy match)
        // ====================================================================
        if (title) {
          try {
            const queryStr = artist ? `${artist} ${title}` : title;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const sRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(queryStr)}`, {
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (sRes.ok) {
              const searchResults = await sRes.json();
              if (Array.isArray(searchResults) && searchResults.length > 0) {
                // Find candidate closest in duration or with syncedLyrics
                let bestMatch = searchResults.find((item) => {
                  if (!item.syncedLyrics) return false;
                  if (durationSec > 0 && item.duration) {
                    return Math.abs(item.duration - durationSec) <= 12;
                  }
                  return true;
                }) || searchResults.find((item) => item.syncedLyrics) || searchResults[0];

                if (bestMatch?.syncedLyrics) {
                  const lines = this.parseLRC(bestMatch.syncedLyrics);
                  if (lines.length > 0) {
                    const result = {
                      type: 'synced',
                      isSynced: true,
                      lines,
                      provider: 'Muse',
                      source: 'Synced Karaoke Lyrics'
                    };
                    this.cache.set(cacheKey, result);
                    return result;
                  }
                }

                if (bestMatch?.plainLyrics && bestMatch.plainLyrics.trim().length > 0) {
                  const result = {
                    type: 'plain',
                    isSynced: false,
                    plainText: bestMatch.plainLyrics.trim(),
                    provider: 'Muse',
                    source: 'Official Lyrics'
                  };
                  this.cache.set(cacheKey, result);
                  return result;
                }
              }
            }
          } catch (e) {}
        }

        // ====================================================================
        // TIER 3: YouTube Music InnerTube (Direct videoId lookup)
        // ====================================================================
        if (videoId) {
          try {
            const nextData = await youtubeMusicService.postYTMusic('next', { videoId });
            const tabs = nextData?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs || [];
            const lyricsTab = tabs.find((t) => {
              const tabTitle = t.tabRenderer?.title?.runs?.[0]?.text || t.tabRenderer?.title || '';
              return (
                typeof tabTitle === 'string' &&
                tabTitle.toLowerCase().includes('lyric') &&
                t.tabRenderer?.endpoint?.browseEndpoint?.browseId
              );
            }) || tabs.find((t) => t.tabRenderer?.endpoint?.browseEndpoint?.browseId?.startsWith('MPLY'));

            const browseId = lyricsTab?.tabRenderer?.endpoint?.browseEndpoint?.browseId;
            if (browseId) {
              const browseData = await youtubeMusicService.postYTMusic('browse', { browseId });
              const descriptionShelf = browseData?.contents?.sectionListRenderer?.contents?.[0]?.musicDescriptionShelfRenderer;
              const text = descriptionShelf?.description?.runs?.[0]?.text;
              const footer = descriptionShelf?.footer?.runs?.[0]?.text;

              if (text && text.trim().length > 0) {
                const result = {
                  type: 'plain',
                  isSynced: false,
                  plainText: text.trim(),
                  provider: 'Muse',
                  source: 'Official Lyrics'
                };
                this.cache.set(cacheKey, result);
                return result;
              }
            }
          } catch (e) {
            console.warn('[LyricsService] lyrics fallback notice:', e);
          }
        }

        // ====================================================================
        // TIER 4: TimedText CC Captions (For videos with subtitle tracks)
        // ====================================================================
        if (videoId) {
          try {
            const timedRes = await fetch(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=json3`);
            if (timedRes.ok) {
              const timedData = await timedRes.json();
              if (Array.isArray(timedData.events) && timedData.events.length > 0) {
                const lines = timedData.events
                  .filter((e) => e.segs && Array.isArray(e.segs) && e.tStartMs !== undefined)
                  .map((e) => {
                    const text = e.segs.map((s) => s.utf8 || '').join('').trim();
                    return {
                      time: Math.round((e.tStartMs / 1000) * 100) / 100,
                      text
                    };
                  })
                  .filter((e) => e.text && e.text !== '\n' && e.text !== '[Music]' && e.text !== '♪');

                if (lines.length > 0) {
                  const result = {
                    type: 'synced',
                    isSynced: true,
                    lines,
                    provider: 'Muse',
                    source: 'Timed Captions'
                  };
                  this.cache.set(cacheKey, result);
                  return result;
                }
              }
            }
          } catch (e) {}
        }

        // ====================================================================
        // TIER 5: Graceful Fallback
        // ====================================================================
        const emptyResult = {
          type: 'none',
          isSynced: false,
          lines: [],
          message: 'No lyrics available for this track'
        };
        this.cache.set(cacheKey, emptyResult);
        return emptyResult;
      } catch (err) {
        console.warn('[LyricsService] Global error:', err);
        return {
          type: 'none',
          isSynced: false,
          lines: [],
          message: 'No lyrics available for this track'
        };
      } finally {
        this.activeRequests.delete(cacheKey);
      }
    })();

    this.activeRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  /**
   * Helper: Calculates current active lyric line index from playback currentTime
   */
  getActiveLineIndex(lines, currentTime) {
    if (!Array.isArray(lines) || lines.length === 0) return -1;
    let activeIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (currentTime >= lines[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
    return activeIndex;
  }
}

export const lyricsService = new LyricsService();

