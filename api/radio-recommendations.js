// Vercel Serverless Function: Algorithmic Cross-Artist Radio Recommendations (Deezer + iTunes)
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const artist = req.query?.artist || url.searchParams.get('artist');
    const title = req.query?.title || url.searchParams.get('title') || '';

    if (!artist) {
      return res.status(400).json({ error: 'Missing artist parameter' });
    }

    // 1. Search artist on Deezer
    const sRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artist)}&limit=1`);
    if (!sRes.ok) throw new Error('Deezer artist search failed');
    const sData = await sRes.json();
    const mainArtist = sData.data?.[0];

    if (!mainArtist) {
      return res.status(200).json({ success: true, tracks: [] });
    }

    // 2. Fetch related artists (multi-artist vibe matching like YouTube Music Radio)
    const [relRes, mainTopRes] = await Promise.all([
      fetch(`https://api.deezer.com/artist/${mainArtist.id}/related?limit=8`),
      fetch(`https://api.deezer.com/artist/${mainArtist.id}/top?limit=3`)
    ]);

    const relData = relRes.ok ? await relRes.json() : { data: [] };
    const mainTopData = mainTopRes.ok ? await mainTopRes.json() : { data: [] };

    const relatedArtists = relData.data || [];
    const mainTopTracks = mainTopData.data || [];

    // 3. For each related artist, fetch their #1 top song
    const queuePromises = relatedArtists.slice(0, 7).map(async (a) => {
      try {
        const topRes = await fetch(`https://api.deezer.com/artist/${a.id}/top?limit=1`);
        if (!topRes.ok) return null;
        const topData = await topRes.json();
        const track = topData.data?.[0];
        if (track) {
          return {
            id: `radio-rec-${track.id}`,
            title: track.title.toUpperCase(),
            artist: track.artist?.name || a.name,
            album: track.album?.title || 'Up Next Radio',
            duration: track.duration || 210,
            cover: track.album?.cover_big || track.album?.cover_medium,
            previewUrl: track.preview || null,
            genre: 'Radio Mix'
          };
        }
      } catch (e) {}
      return null;
    });

    const relatedTracks = (await Promise.all(queuePromises)).filter(Boolean);

    // Filter main artist top tracks so we don't duplicate the currently playing title
    const mainTracks = mainTopTracks
      .filter(t => !title || !t.title.toLowerCase().includes(title.toLowerCase()))
      .slice(0, 2)
      .map(track => ({
        id: `radio-rec-${track.id}`,
        title: track.title.toUpperCase(),
        artist: track.artist?.name || mainArtist.name,
        album: track.album?.title || 'Up Next Radio',
        duration: track.duration || 210,
        cover: track.album?.cover_big || track.album?.cover_medium,
        previewUrl: track.preview || null,
        genre: 'Radio Mix'
      }));

    // Interleave main artist top hits with diverse related artists for true radio experience
    const combinedTracks = [];
    if (mainTracks[0]) combinedTracks.push(mainTracks[0]);
    relatedTracks.forEach((t, idx) => {
      combinedTracks.push(t);
      if (idx === 2 && mainTracks[1]) combinedTracks.push(mainTracks[1]);
    });

    return res.status(200).json({
      success: true,
      mainArtist: mainArtist.name,
      tracks: combinedTracks
    });
  } catch (err) {
    console.error('Radio recommendations error:', err);
    return res.status(500).json({ error: err.message, tracks: [] });
  }
}
