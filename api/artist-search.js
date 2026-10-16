// Vercel Serverless Function: Deezer HD Artist Face Portraits Resolver
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const q = req.query?.q || url.searchParams.get('q');

    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter q' });
    }

    const deezerRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}&limit=15`);
    if (!deezerRes.ok) {
      return res.status(200).json({ success: true, artists: [] });
    }

    const data = await deezerRes.json();
    const artists = (data.data || []).map(a => ({
      id: `artist-${a.id}`,
      name: a.name,
      genre: 'World Artist',
      photo: a.picture_xl || a.picture_big || a.picture_medium || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      topSongs: []
    }));

    return res.status(200).json({ success: true, artists });
  } catch (err) {
    console.error('Artist search error:', err);
    return res.status(500).json({ error: err.message, artists: [] });
  }
}
