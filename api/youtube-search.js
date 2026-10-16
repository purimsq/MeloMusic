// Vercel Serverless Function: Ad-free YouTube Video ID Resolver
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

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' official audio')}`;
    const ytRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    if (!ytRes.ok) {
      return res.status(200).json({ success: false, videoId: null });
    }

    const html = await ytRes.text();
    const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    const videoId = match ? match[1] : null;

    return res.status(200).json({ success: true, videoId });
  } catch (err) {
    console.error('YouTube search resolver error:', err);
    return res.status(500).json({ error: err.message, videoId: null });
  }
}
