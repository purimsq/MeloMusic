// YouTube Music Live Enterprise Service for MUSE PC Desktop
// Direct integration with YouTube Music InnerTube endpoints (search, radio queue, artist channels, lyrics, related)

const YT_CLIENT_CONTEXT = {
  client: {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20231201.01.00',
    hl: 'en',
    gl: 'US'
  }
};

export class YouTubeMusicService {
  constructor() {
    this.searchCache = new Map();
    this.suggestionsCache = new Map();
    this.radioCache = new Map();
    this.artistCache = new Map();
    this.albumCache = new Map();
  }

  /**
   * Helper: safe fetch through Electron IPC bridge or local Vite proxy to YouTube Music InnerTube
   */
  async postYTMusic(endpoint, body) {
    const payload = {
      context: YT_CLIENT_CONTEXT,
      ...body
    };

    // 1. Electron IPC Bridge (works standalone in packaged .exe with zero CORS)
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.fetchInnerTube === 'function') {
      try {
        const result = await window.electronAPI.fetchInnerTube(endpoint, payload);
        if (result && !result.error) {
          return result;
        }
        if (result?.error) {
          console.warn(`[InnerTube IPC] API error on ${endpoint}:`, result.error);
        }
      } catch (err) {
        console.warn(`[InnerTube IPC] IPC error on ${endpoint}:`, err);
      }
    }

    // 2. Local Vite dev server proxy (used during web browser / Vite dev mode)
    const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:5174';

    try {
      const res = await fetch(`${baseUrl}/yt-music/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`YT Music request failed with status ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.warn(`Error querying /yt-music/${endpoint}:`, err);
      return null;
    }
  }

  /**
   * Universal Live Search across YouTube Music catalog
   * Includes Songs, Music Videos, Slowed+Reverb, Acoustic, Lyrics videos, etc.
   */
  async search(query, filter = 'all') {
    const trimmed = (query || '').trim();
    if (!trimmed) return [];

    const cacheKey = `${trimmed}_${filter}`.toLowerCase();
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey);
    }

    const data = await this.postYTMusic('search', { query: trimmed });
    if (!data) return [];

    const sections =
      data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

    const results = [];
    const seenVideoIds = new Set();

    sections.forEach((sec) => {
      const cardShelf = sec.musicCardShelfRenderer;
      const shelfArtist = cardShelf?.title?.runs?.[0]?.text || cardShelf?.header?.musicCardShelfHeaderBasicRenderer?.title?.runs?.[0]?.text || '';
      const list = sec.itemSectionRenderer?.contents || cardShelf?.contents || [];

      list.forEach((wrapper) => {
        const item = wrapper.musicResponsiveListItemRenderer;
        if (!item) return;

        const flex0 = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const flex1 = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const flex2 = item.flexColumns?.[2]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];

        const title = flex0[0]?.text || '';
        const playBtn = item.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer;
        const videoId =
          item.playlistItemData?.videoId ||
          playBtn?.playNavigationEndpoint?.watchEndpoint?.videoId ||
          flex0[0]?.navigationEndpoint?.watchEndpoint?.videoId;

        if (!videoId || seenVideoIds.has(videoId) || !title) return;
        seenVideoIds.add(videoId);

        // Parse artist, duration, category from flex1
        let type = 'Song';
        let artist = shelfArtist || '';
        let album = '';
        let durationFormatted = '3:30';
        let views = 'Official YouTube';

        if (flex1.length > 0) {
          const typeCandidate = flex1[0]?.text || '';
          if (['Song', 'Video', 'Album', 'Single', 'EP'].includes(typeCandidate)) {
            type = typeCandidate;
          }

          // Check if flex1 contains artist (usually after bullet ' • ')
          const artistRuns = [];
          let passedBullet = false;
          for (let i = 0; i < flex1.length; i++) {
            const r = flex1[i];
            const text = r.text || '';
            if (text === ' • ') {
              passedBullet = true;
              continue;
            }
            if (passedBullet) {
              if (text.includes(':') && /^\d+:\d+$/.test(text.trim())) {
                durationFormatted = text.trim();
                break;
              }
              if (/^\d+(\.\d+)?[KMB]/.test(text.trim())) {
                views = text.trim();
                break;
              }
              artistRuns.push(text);
            }
          }

          if (artistRuns.length > 0 && !artist) {
            artist = artistRuns.join('').trim();
          } else if (!artist && flex1.length >= 3 && flex1[2]?.text && flex1[2].text !== ' • ') {
            artist = flex1[2].text.trim();
          } else if (!artist && flex1[0]?.text && flex1[0].text !== type) {
            artist = flex1[0].text.trim();
          }
        }

        if (flex2.length > 0) {
          const f2Text = flex2[0]?.text || '';
          if (f2Text.includes(':') && /^\d+:\d+$/.test(f2Text.trim())) {
            durationFormatted = f2Text.trim();
          } else if (/^\d+(\.\d+)?[KMB]/.test(f2Text.trim())) {
            views = f2Text.trim();
          }
        }

        if (!artist) artist = 'Featured Artist';

        // Parse duration seconds
        const parts = durationFormatted.split(':').map(Number);
        const durationSec = parts.length === 2 ? parts[0] * 60 + parts[1] : 210;

        // Thumbnails
        const thumbs = item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
        const highestThumb = thumbs.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        const highResSquare = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        const video16x9 = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

        results.push({
          id: `yt-${videoId}`,
          videoId,
          title,
          artist,
          album: album || `${title} - Single`,
          duration: durationSec,
          durationFormatted,
          cover: highestThumb || highResSquare,
          videoThumbnail: video16x9,
          type,
          views
        });
      });
    });

    this.searchCache.set(cacheKey, results);
    return results;
  }

  /**
   * Fetch YouTube Music query autocomplete suggestions and direct entity matches
   * Corresponds directly to YouTube Music's live search dropdown suggestions
   */
  async getSearchSuggestions(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      return { queries: [], items: [] };
    }

    const cacheKey = trimmed.toLowerCase();
    if (this.suggestionsCache && this.suggestionsCache.has(cacheKey)) {
      return this.suggestionsCache.get(cacheKey);
    }

    try {
      const data = await this.postYTMusic('music/get_search_suggestions', { input: trimmed });
      if (!data) return { queries: [], items: [] };

      const sections = data.contents || [];
      const queries = [];
      const items = [];

      // Section 0: Text query autocomplete suggestions
      const sec0 = sections[0]?.searchSuggestionsSectionRenderer?.contents || [];
      sec0.forEach((it) => {
        const r = it.searchSuggestionRenderer || it.historySuggestionRenderer;
        if (!r) return;
        const text =
          r.navigationEndpoint?.searchEndpoint?.query ||
          r.suggestion?.runs?.map((x) => x.text).join('') ||
          '';
        const runs = r.suggestion?.runs || [];
        if (text && !queries.some((q) => q.text.toLowerCase() === text.toLowerCase())) {
          queries.push({ text, runs });
        }
      });

      // Section 1: Direct entity results (Songs, Videos, Albums)
      const sec1 = sections[1]?.searchSuggestionsSectionRenderer?.contents || [];
      sec1.forEach((it) => {
        const r = it.musicResponsiveListItemRenderer;
        if (!r) return;

        const f0 = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const f1 = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];

        const title = f0.map((x) => x.text).join('').trim();
        const subtitle = f1.map((x) => x.text).join('').trim();

        const videoId =
          r.navigationEndpoint?.watchEndpoint?.videoId ||
          r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
          r.playlistItemData?.videoId ||
          '';

        const thumbs = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
        const cover = thumbs.length
          ? thumbs[thumbs.length - 1].url
          : videoId
          ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
          : '';

        // Extract metadata parts: type, artist, plays/views
        const parts = subtitle.split(' • ').map((s) => s.trim());
        const type = parts[0] || (videoId ? 'Song' : 'Album');
        const artist = parts[1] || 'Featured Artist';
        const views = parts[2] || '';

        if (title) {
          items.push({
            id: videoId ? `yt-${videoId}` : `item-${title}`,
            videoId,
            title,
            subtitle,
            type,
            artist,
            views,
            duration: 210,
            durationFormatted: '3:30',
            cover
          });
        }
      });

      const result = { queries, items };
      if (!this.suggestionsCache) this.suggestionsCache = new Map();
      this.suggestionsCache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.warn('Error fetching search suggestions:', err);
      return { queries: [], items: [] };
    }
  }

  /**
   * Fetches YouTube Music's Official "Up Next" Radio Queue for any video
   * Emits a rich 50-track continuous station matching YouTube Music exactly
   */
  async getRadioQueue(videoId, currentTrack = null) {
    if (!videoId) return [];

    if (this.radioCache.has(videoId)) {
      return this.radioCache.get(videoId);
    }

    const playlistId = `RDAMVM${videoId}`;
    const data = await this.postYTMusic('next', { videoId, playlistId });

    const queue = [];
    const seenVideoIds = new Set();

    if (currentTrack) {
      queue.push(currentTrack);
      if (currentTrack.videoId) seenVideoIds.add(currentTrack.videoId);
    }

    if (data) {
      const tabs =
        data.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs || [];
      const queueTab = tabs[0]?.tabRenderer?.content?.musicQueueRenderer;
      const items = queueTab?.content?.playlistPanelRenderer?.contents || [];

      items.forEach((it) => {
        const r = it.playlistPanelVideoRenderer;
        if (!r || !r.videoId || seenVideoIds.has(r.videoId)) return;

        seenVideoIds.add(r.videoId);
        const title = r.title?.runs?.[0]?.text || 'Track';
        const artist = r.longBylineText?.runs?.[0]?.text || 'Artist';
        const durationFormatted = r.lengthText?.runs?.[0]?.text || '3:30';

        const parts = durationFormatted.split(':').map(Number);
        const durationSec = parts.length === 2 ? parts[0] * 60 + parts[1] : 210;

        const thumbs = r.thumbnail?.thumbnails || [];
        const thumbUrl = thumbs.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`;

        queue.push({
          id: `yt-${r.videoId}`,
          videoId: r.videoId,
          title,
          artist,
          album: 'Up Next Radio',
          duration: durationSec,
          durationFormatted,
          cover: thumbUrl,
          videoThumbnail: `https://i.ytimg.com/vi/${r.videoId}/maxresdefault.jpg`,
          type: 'Song',
          views: 'Official Audio'
        });
      });
    }

    // Fallback: if queue is small, fetch related songs for the artist
    if (queue.length < 5 && currentTrack?.artist) {
      const extraTracks = await this.search(`${currentTrack.artist} top hits`);
      extraTracks.forEach((t) => {
        if (!seenVideoIds.has(t.videoId)) {
          seenVideoIds.add(t.videoId);
          queue.push(t);
        }
      });
    }

    this.radioCache.set(videoId, queue);
    return queue;
  }

  /**
   * Fetches YouTube Music Official Artist Channel Profile
   * Header banner, biography, Top Songs, Albums, Singles, Videos, Playlists, Fans Also Like
   */
  async getArtistProfile(artistName, browseId = null) {
    const trimmed = (artistName || '').trim();
    if (!trimmed && !browseId) return null;

    const cacheKey = (browseId || trimmed).toLowerCase();
    if (this.artistCache.has(cacheKey)) {
      return this.artistCache.get(cacheKey);
    }

    let targetBrowseId = browseId;

    // If we don't have a browseId, find it from searching for the artist
    if (!targetBrowseId) {
      const searchData = await this.postYTMusic('search', { query: trimmed });
      const card =
        searchData?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicCardShelfRenderer;
      targetBrowseId = card?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;

      if (!targetBrowseId) {
        // Look in sections for first artist item
        const sections = searchData?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
        for (const sec of sections) {
          const list = sec.itemSectionRenderer?.contents || [];
          for (const wrapper of list) {
            const item = wrapper.musicResponsiveListItemRenderer;
            const flex1 = item?.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            for (const r of flex1) {
              if (r.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
                targetBrowseId = r.navigationEndpoint.browseEndpoint.browseId;
                break;
              }
            }
            if (targetBrowseId) break;
          }
          if (targetBrowseId) break;
        }
      }
    }

    let artistData = null;
    if (targetBrowseId) {
      artistData = await this.postYTMusic('browse', { browseId: targetBrowseId });
    }

    // Default structure
    const profile = {
      id: targetBrowseId || `artist-${trimmed.toLowerCase().replace(/\s+/g, '-')}`,
      name: trimmed,
      subscribers: '15.4M subscribers',
      bio: `${trimmed} is a globally recognized musical icon on YouTube Music. Explore their full catalog, popular hits, and visual albums.`,
      banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1400&q=85',
      photo: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      topSongs: [],
      albums: [],
      singles: [],
      videos: [],
      playlists: [],
      related: []
    };

    if (artistData) {
      // Header info
      const header = artistData.header?.musicImmersiveHeaderRenderer || artistData.header?.musicVisualHeaderRenderer;
      if (header) {
        profile.name = header.title?.runs?.[0]?.text || profile.name;
        profile.subscribers = header.subscriptionButton?.subscribeButtonRenderer?.subscriberCountText?.runs?.[0]?.text || profile.subscribers;
        profile.bio = header.description?.runs?.[0]?.text || profile.bio;

        const banners = header.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
        if (banners.length > 0) {
          profile.banner = banners.slice(-1)[0]?.url || profile.banner;
          profile.photo = banners[0]?.url || profile.photo;
        }
      }

      // Sections (Top Songs, Albums, Videos, etc.)
      const sections =
        artistData.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];

      sections.forEach((sec) => {
        const shelf = sec.musicShelfRenderer;
        const carousel = sec.musicCarouselShelfRenderer;

        const shelfTitle = shelf?.title?.runs?.[0]?.text || '';
        const carouselTitle = carousel?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || '';

        // 1. Top Songs shelf
        if (shelf && shelf.contents) {
          shelf.contents.forEach((wrapper) => {
            const it = wrapper.musicResponsiveListItemRenderer;
            if (!it) return;

            const flex0 = it.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            const flex1 = it.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
            const playBtn = it.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer;
            const videoId =
              it.playlistItemData?.videoId || playBtn?.playNavigationEndpoint?.watchEndpoint?.videoId;

            const title = flex0[0]?.text || '';
            let album = '';
            let durationFormatted = '3:20';

            if (flex1.length > 0) {
              album = flex1[0]?.text || '';
              const last = flex1[flex1.length - 1]?.text;
              if (last && last.includes(':')) durationFormatted = last;
            }

            const thumbs = it.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            const thumbUrl = thumbs.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

            if (videoId && title) {
              const parts = durationFormatted.split(':').map(Number);
              const durationSec = parts.length === 2 ? parts[0] * 60 + parts[1] : 200;

              profile.topSongs.push({
                id: `yt-${videoId}`,
                videoId,
                title,
                artist: profile.name,
                album: album || `${title} - Hit`,
                duration: durationSec,
                durationFormatted,
                cover: thumbUrl,
                videoThumbnail: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
                type: 'Song',
                views: 'Official Audio'
              });
            }
          });
        }

        // 2. Albums & Singles & Videos in Carousels
        if (carousel && carousel.contents) {
          const titleLower = carouselTitle.toLowerCase();
          carousel.contents.forEach((itemWrapper) => {
            const card = itemWrapper.musicTwoRowItemRenderer;
            if (!card) return;

            const title = card.title?.runs?.[0]?.text || '';
            const subtitle = card.subtitle?.runs?.[0]?.text || '';
            const thumbs = card.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
            const cover = thumbs.slice(-1)[0]?.url || profile.banner;
            const videoId = card.navigationEndpoint?.watchEndpoint?.videoId;
            const browseId =
              card.navigationEndpoint?.browseEndpoint?.browseId ||
              card.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;

            if (titleLower.includes('album')) {
              profile.albums.push({ id: `alb-${title}`, browseId, title, year: subtitle, cover, artist: profile.name });
            } else if (titleLower.includes('single')) {
              profile.singles.push({ id: `sgl-${title}`, browseId, title, year: subtitle, cover, artist: profile.name });
            } else if (titleLower.includes('video')) {
              profile.videos.push({
                id: `yt-${videoId || Math.random()}`,
                videoId: videoId || '09R8_2nJtjg',
                title,
                artist: profile.name,
                cover,
                views: subtitle || 'Music Video'
              });
            } else if (titleLower.includes('fans') || titleLower.includes('like')) {
              profile.related.push({
                id: `rel-${title}`,
                name: title,
                subscribers: subtitle || 'Artist',
                photo: cover
              });
            }
          });
        }
      });
    }

    // Fallback if top songs were not in browse response: query search directly
    if (profile.topSongs.length === 0) {
      const hits = await this.search(`${trimmed} songs`);
      profile.topSongs = hits.slice(0, 15);
    }

    this.artistCache.set(cacheKey, profile);
    return profile;
  }

  /**
   * Helper to retrieve and advance the non-repeating spotlight cycle across selected artists
   */
  getNextSpotlightArtist(artistNames) {
    if (!artistNames || artistNames.length === 0) return null;
    const STORAGE_KEY = 'melo_spotlight_cycle';
    let history = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) history = JSON.parse(stored);
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }

    // Keep only artists that are currently in user's selected list (auto-cleans removed artists)
    history = history.filter((name) => artistNames.includes(name));

    // Find artists who haven't had a spotlight turn yet in this cycle
    let unvisited = artistNames.filter((name) => !history.includes(name));

    // If all artists have had their turn, reset the cycle!
    if (unvisited.length === 0) {
      history = [];
      unvisited = [...artistNames];
    }

    // Pick a random artist from unvisited
    const randomIndex = Math.floor(Math.random() * unvisited.length);
    const chosen = unvisited[randomIndex] || artistNames[0];

    // Record in history and persist
    history.push(chosen);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save spotlight cycle:', e);
    }

    return chosen;
  }

  /**
   * Helper to retrieve and advance the non-repeating "Today's Focus" cycle across selected artists
   * Operates independently from the Quick Picks spotlight cycle
   */
  getNextFocusArtist(artistNames, excludeArtist = null) {
    if (!artistNames || artistNames.length === 0) return null;
    const STORAGE_KEY = 'melo_focus_cycle';
    let history = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) history = JSON.parse(stored);
      if (!Array.isArray(history)) history = [];
    } catch {
      history = [];
    }

    history = history.filter((name) => artistNames.includes(name));

    // Prefer artists other than the currently spotlighted artist
    let candidatePool = artistNames.filter((name) => name !== excludeArtist);
    if (candidatePool.length === 0) candidatePool = [...artistNames];

    let unvisited = candidatePool.filter((name) => !history.includes(name));

    if (unvisited.length === 0) {
      history = [];
      unvisited = [...candidatePool];
    }

    const randomIndex = Math.floor(Math.random() * unvisited.length);
    const chosen = unvisited[randomIndex] || candidatePool[0];

    history.push(chosen);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save focus cycle:', e);
    }

    return chosen;
  }

  /**
   * Fetches Real Curated Home Feed based on user's selected artists
   * Features:
   * 1. Quick Picks: 30% chance Spotlight on {Artist}, 70% Diverse Multi-Artist Blend.
   * 2. Top Songs & Video Hits: 30% chance "Today's Focus is {Artist}" (independent round-robin system), 70% multi-artist rotation.
   * 3. Recommended Videos: Rotates across other artists in user's taste DNA.
   */
  async getHomeFeed(selectedArtists = [], priorityArtists = []) {
    const rawNames = selectedArtists.map((a) => (typeof a === 'string' ? a : a?.name)).filter(Boolean);
    const artistNames = rawNames.length > 0 ? rawNames : ['Drake', 'The Weeknd', 'Billie Eilish', 'Taylor Swift', 'Travis Scott'];

    const priorityNames = (priorityArtists || [])
      .map((a) => (typeof a === 'string' ? a : a?.name))
      .filter(Boolean);

    // 70/30 probability: 30% chance for Spotlight Mode on Quick Picks, 70% Diverse Multi-Artist Blend
    // If priority artists were added, boost spotlight chance to 50% so new artists get immediate recognition
    const isSpotlightMode = (priorityNames.length > 0 ? Math.random() < 0.50 : Math.random() < 0.30) && artistNames.length > 0;
    const spotlightArtist = isSpotlightMode
      ? (priorityNames.length > 0 && Math.random() < 0.65 ? priorityNames[0] : this.getNextSpotlightArtist(artistNames))
      : null;

    // 70/30 probability: 30% chance for "Today's Focus" on Top Songs & Video Hits (independent system)
    const isFocusMode = Math.random() < 0.30 && artistNames.length > 0;
    const focusArtist = isFocusMode ? this.getNextFocusArtist(artistNames, spotlightArtist) : null;

    let quickPicks = [];
    let topHits = [];
    let videos = [];

    // Determine artists for Top Hits and Videos:
    // If focus mode is active, topHits pulls from focusArtist.
    // Otherwise, pick a rotated artist dynamically from pool (never locked to index 0/1).
    const remainingForHits = artistNames.filter((name) => name !== spotlightArtist);
    const shuffledHits = [...remainingForHits].sort(() => Math.random() - 0.5);
    const topHitArtist = isFocusMode
      ? focusArtist
      : (shuffledHits[0] || artistNames[0] || 'The Weeknd');

    // For videos, pick an artist different from both spotlight and focus if possible
    const remainingForVideos = artistNames.filter((name) => name !== spotlightArtist && name !== topHitArtist);
    const shuffledVideos = [...remainingForVideos].sort(() => Math.random() - 0.5);
    const videoArtist = shuffledVideos[0] || remainingForHits[1] || artistNames[1] || artistNames[0] || 'Travis Scott';

    if (isSpotlightMode) {
      // Fetch Quick Picks for spotlight artist, Top Hits for topHitArtist, and Videos for videoArtist
      const [qpRes, hitsRes, vidsRes] = await Promise.all([
        this.search(`${spotlightArtist} popular hits`),
        this.search(`${topHitArtist} top tracks official`),
        this.search(`${videoArtist} official music video`)
      ]);
      quickPicks = qpRes || [];
      topHits = hitsRes || [];
      videos = vidsRes || [];
    } else {
      // Mode A: Diverse Multi-Artist Blend for Quick Picks
      // Guarantee priority (newly added) artists are placed at the front of the blend!
      const prioritySet = new Set(priorityNames.map((n) => n.toLowerCase()));
      const priorityInList = artistNames.filter((n) => prioritySet.has(n.toLowerCase()));
      const otherArtists = artistNames.filter((n) => !prioritySet.has(n.toLowerCase())).sort(() => Math.random() - 0.5);
      const blendArtists = [...priorityInList, ...otherArtists].slice(0, Math.min(5, artistNames.length));

      const [qpResults, hitsRes, vidsRes] = await Promise.all([
        Promise.all(blendArtists.map((name) => this.search(`${name} popular hits`))),
        this.search(`${topHitArtist} top tracks official`),
        this.search(`${videoArtist} official music video`)
      ]);

      const combinedPicks = [];
      const maxPerArtist = 3;
      for (let i = 0; i < maxPerArtist; i++) {
        qpResults.forEach((list) => {
          if (list && list[i]) combinedPicks.push(list[i]);
        });
      }
      qpResults.forEach((list) => {
        if (list) {
          list.slice(maxPerArtist).forEach((t) => {
            if (combinedPicks.length < 24 && !combinedPicks.some((x) => x.videoId === t.videoId)) {
              combinedPicks.push(t);
            }
          });
        }
      });

      // If priority artist exists, place their tracks at the front of Quick Picks so user immediately hears them
      if (priorityInList.length > 0) {
        const priorityTracks = combinedPicks.filter((t) =>
          priorityInList.some((pName) => (t.artist || '').toLowerCase().includes(pName.toLowerCase()))
        );
        const otherTracks = combinedPicks.filter(
          (t) => !priorityInList.some((pName) => (t.artist || '').toLowerCase().includes(pName.toLowerCase()))
        ).sort(() => Math.random() - 0.5);
        quickPicks = [...priorityTracks, ...otherTracks];
      } else {
        quickPicks = combinedPicks.sort(() => Math.random() - 0.5);
      }

      topHits = hitsRes || [];
      videos = vidsRes || [];
    }

    // Fallback if initial queries returned empty
    if (!quickPicks || quickPicks.length === 0) {
      quickPicks = await this.search('top global billboard hits');
    }
    if (!topHits || topHits.length === 0) {
      topHits = await this.search('trending music hits official');
    }
    if (!videos || videos.length === 0) {
      videos = await this.search('trending official music videos');
    }

    return {
      quickPicks: (quickPicks || []).slice(0, 16),
      topHits: (topHits || []).slice(0, 16),
      recommendedVideos: (videos || []).slice(0, 10),
      isSpotlight: Boolean(isSpotlightMode),
      spotlightArtist: isSpotlightMode ? spotlightArtist : null,
      isFocus: Boolean(isFocusMode),
      focusArtist: isFocusMode ? focusArtist : null
    };
  }

  /**
   * Fetches Mood Feed for mood filter chips
   * ("Energize", "Workout", "Relax", "Focus", "Commute", "Party")
   */
  async getMoodFeed(moodName) {
    const moodQueryMap = {
      Energize: 'High Energy Upbeat Pop Hip-Hop Hits',
      Workout: 'Gym Workout Beast Mode Motivation Songs',
      Relax: 'Chill Relaxing Acoustic Lofi Ambient Music',
      Focus: 'Deep Focus Study Instrumental Beats',
      Commute: 'Road Trip Drive Highway Hits',
      Party: 'Club Dance Party Hits 2026'
    };

    const q = moodQueryMap[moodName] || `${moodName} music hits`;
    const tracks = await this.search(q);
    return tracks.slice(0, 20);
  }

  /**
   * Finds the official video or lyric video for a given track
   * Ensures seamless switching between Song and Video modes
   */
  async findOfficialVideo(track) {
    if (!track) return null;
    if (track.officialVideoId) return track.officialVideoId;

    try {
      const q = `${track.artist} ${track.title} official music video`;
      const results = await this.search(q, 'videos');
      if (results && results.length > 0) {
        // Prioritize official music video, then official video, then lyric video
        const cleanTitle = (t) => (t.title || '').toLowerCase();
        const official = results.find((r) => {
          const t = cleanTitle(r);
          return (
            t.includes('official music video') ||
            t.includes('official video') ||
            t.includes('music video') ||
            t.includes('official lyric video') ||
            t.includes('lyric video')
          );
        });

        const selected = official || results[0];
        if (selected?.videoId) {
          track.officialVideoId = selected.videoId;
          return selected.videoId;
        }
      }
    } catch (e) {
      console.warn('Find official video error:', e);
    }
    return track.videoId;
  }

  /**
   * Fetches full Album details and tracklist from YouTube Music InnerTube
   * Supports both browseId (MPREb_...) and fallback search
   */
  async getAlbumDetails(albumTitle, artistName = '', browseId = null) {
    const trimmedTitle = (albumTitle || '').trim();
    const trimmedArtist = (artistName || '').trim();
    const cacheKey = (browseId || `${trimmedArtist}_${trimmedTitle}`).toLowerCase();

    if (this.albumCache.has(cacheKey)) {
      return this.albumCache.get(cacheKey);
    }

    let albumData = null;
    let targetBrowseId = browseId;

    // If we don't have browseId, try finding it via search
    if (!targetBrowseId && trimmedTitle) {
      try {
        const q = `${trimmedArtist} ${trimmedTitle} album`.trim();
        const searchData = await this.postYTMusic('search', { query: q });
        const card = searchData?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicCardShelfRenderer;
        const candidate = card?.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId;
        if (candidate && candidate.startsWith('MPREb_')) {
          targetBrowseId = candidate;
        }
      } catch (err) {
        console.warn('Album search browseId resolution warning:', err);
      }
    }

    if (targetBrowseId) {
      try {
        albumData = await this.postYTMusic('browse', { browseId: targetBrowseId });
      } catch (err) {
        console.warn('Album browse fetch warning:', err);
      }
    }

    const twoCol = albumData?.contents?.twoColumnBrowseResultsRenderer;
    const header =
      twoCol?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicResponsiveHeaderRenderer ||
      albumData?.header?.musicDetailHeaderRenderer;
    const shelf =
      twoCol?.secondaryContents?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer ||
      albumData?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer;

    const parsedTitle = header?.title?.runs?.[0]?.text || trimmedTitle || 'Album';
    const subtitleRuns = header?.subtitle?.runs || [];
    const subtitle = subtitleRuns.map((r) => r.text).join('') || 'Album';
    const thumbs =
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
      [];
    const cover = thumbs.slice(-1)[0]?.url || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80';

    const rawContents = shelf?.contents || [];
    const tracks = rawContents
      .map((w, idx) => {
        const r = w.musicResponsiveListItemRenderer;
        if (!r) return null;
        const tTitle = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text || `Track ${idx + 1}`;
        const dur = r.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs?.[0]?.text || '3:30';
        const vid =
          r.playlistItemData?.videoId ||
          r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId;

        const parts = dur.split(':').map(Number);
        const durationSec = parts.length === 2 ? parts[0] * 60 + parts[1] : 210;

        return {
          id: `yt-${vid || Math.random()}`,
          videoId: vid,
          title: tTitle,
          artist: trimmedArtist || parsedTitle,
          album: parsedTitle,
          duration: durationSec,
          durationFormatted: dur,
          cover,
          type: 'Song'
        };
      })
      .filter((t) => t && t.videoId);

    // If browse returned 0 tracks, fallback to high-accuracy search for the album tracks
    if (tracks.length === 0 && trimmedTitle) {
      try {
        const fallbackHits = await this.search(`${trimmedArtist} ${trimmedTitle} full album`);
        if (fallbackHits && fallbackHits.length > 0) {
          fallbackHits.forEach((t) => {
            tracks.push({
              ...t,
              album: parsedTitle
            });
          });
        }
      } catch (err) {
        console.warn('Album fallback tracks search warning:', err);
      }
    }

    const result = {
      id: targetBrowseId || `alb-${parsedTitle}`,
      browseId: targetBrowseId,
      title: parsedTitle,
      artist: trimmedArtist || 'Artist',
      subtitle,
      cover,
      tracks
    };

    if (tracks.length > 0) {
      this.albumCache.set(cacheKey, result);
    }
    return result;
  }
}

export const youtubeMusicService = new YouTubeMusicService();
