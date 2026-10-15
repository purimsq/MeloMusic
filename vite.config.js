import { defineConfig } from 'vite';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  server: {
    port: 5173,
    host: true
  },
  plugins: [
    {
      name: 'melo-email-otp-server',
      configureServer(server) {
        // Step 1: Send OTP Verification Email
        server.middlewares.use('/api/send-otp', async (req, res, next) => {
          if (req.method !== 'POST') {
            return next();
          }

          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              const { email, code, name } = JSON.parse(body || '{}');

              if (!email || !code) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Missing email or OTP code' }));
              }

              // Create Gmail transporter with user's app credentials
              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: 'primemonexa@gmail.com',
                  pass: 'hbbgiaavokfvjnxq'
                }
              });

              // Branded luxury Melo verification email with official 3D logo
              const mailOptions = {
                from: '"Melo Music" <primemonexa@gmail.com>',
                to: email,
                subject: `${code} is your Melo verification code`,
                attachments: [
                  {
                    filename: 'melo-logo.png',
                    path: path.resolve(__dirname, 'public/icons/logo.png'),
                    cid: 'melologo'
                  }
                ],
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #EBEBE9; margin: 0; padding: 40px 10px; color: #121212; }
                      .card { max-width: 480px; margin: 0 auto; background: #FFFFFF; border-radius: 28px; padding: 36px 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); text-align: center; }
                      h1 { font-size: 24px; font-weight: 800; margin: 12px 0 10px; color: #111111; letter-spacing: -0.5px; }
                      p { font-size: 14px; line-height: 1.5; color: #74747A; margin: 0 0 24px; }
                      .otp-box { background: #F5F5F3; border: 1px solid rgba(0,0,0,0.08); border-radius: 20px; padding: 18px; margin: 24px 0; letter-spacing: 10px; font-size: 34px; font-weight: 800; color: #111111; font-family: monospace; }
                      .footer { font-size: 11px; color: #9E9EA4; margin-top: 24px; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 18px; }
                    </style>
                  </head>
                  <body>
                    <div class="card">
                      <img src="cid:melologo" width="68" height="68" alt="Melo Logo" style="display: block; margin: 0 auto 12px; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);" />
                      <h1>Verify Your Melo Account</h1>
                      <p>Hello ${name || 'Music Lover'},<br>Use the code below to complete your sign-up and sync your favorite artists, playlists, and lossless music vault.</p>
                      
                      <div class="otp-box">${code}</div>

                      <p style="font-size: 12px; margin-bottom: 12px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>

                      <div class="footer">
                        Melo Music • Elevate Every Moment With Sound<br>
                        Sent via Melo Cloud Auth Service
                      </div>
                    </div>
                  </body>
                  </html>
                `
              };

              await transporter.sendMail(mailOptions);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'OTP sent successfully' }));
            } catch (err) {
              console.error('Failed to send OTP email:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to send OTP email', details: err.message }));
            }
          });
        });

        // Step 2: Send Onboarding Welcome Email with Logo & Curated Taste
        server.middlewares.use('/api/send-welcome', async (req, res, next) => {
          if (req.method !== 'POST') return next();

          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const { email, name, artists } = JSON.parse(body || '{}');

              if (!email) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'Missing email' }));
              }

              const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: 'primemonexa@gmail.com',
                  pass: 'hbbgiaavokfvjnxq'
                }
              });

              const artistListHtml = (artists && artists.length > 0)
                ? artists.map(a => `<span style="display: inline-block; background: #F5F5F3; padding: 6px 14px; border-radius: 16px; font-size: 13px; font-weight: 700; color: #111111; margin: 4px;">${typeof a === 'string' ? a : a.name}</span>`).join('')
                : '<span style="color: #74747A;">Your personalized artist universe</span>';

              const mailOptions = {
                from: '"Melo Music" <primemonexa@gmail.com>',
                to: email,
                subject: `Welcome to Melo, ${name || 'Music Lover'} — Your Sound Sanctuary Is Ready`,
                attachments: [
                  {
                    filename: 'melo-logo.png',
                    path: path.resolve(__dirname, 'public/icons/logo.png'),
                    cid: 'melologo'
                  }
                ],
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8">
                    <style>
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #EBEBE9; margin: 0; padding: 40px 10px; color: #121212; }
                      .card { max-width: 500px; margin: 0 auto; background: #FFFFFF; border-radius: 32px; padding: 40px 32px; box-shadow: 0 12px 36px rgba(0,0,0,0.06); text-align: center; }
                      h1 { font-size: 26px; font-weight: 800; margin: 14px 0 8px; color: #111111; letter-spacing: -0.5px; }
                      p { font-size: 14px; line-height: 1.55; color: #74747A; margin: 0 0 20px; }
                      .artists-box { background: #F8F8F7; border: 1px solid rgba(0,0,0,0.06); border-radius: 20px; padding: 18px 16px; margin: 20px 0 26px; }
                      .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 20px 0; text-align: left; }
                      .feature-item { background: #F5F5F3; padding: 14px 16px; border-radius: 18px; font-size: 12px; color: #121212; }
                      .feature-title { font-weight: 800; font-size: 13px; margin-bottom: 2px; }
                      .footer { font-size: 11px; color: #9E9EA4; margin-top: 24px; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 18px; line-height: 1.5; }
                    </style>
                  </head>
                  <body>
                    <div class="card">
                      <img src="cid:melologo" width="76" height="76" alt="Melo Logo" style="display: block; margin: 0 auto; border-radius: 22px; box-shadow: 0 8px 24px rgba(0,0,0,0.12);" />
                      <h1>Welcome to Melo</h1>
                      <p>Hello ${name || 'Music Lover'},<br>Your personal sanctuary of music is now curated and fully set up. Here is a glimpse of what is waiting for you:</p>

                      <div class="artists-box">
                        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; color: #9E9EA4; margin-bottom: 10px;">Your Curated Artists</div>
                        ${artistListHtml}
                      </div>

                      <div class="feature-grid">
                        <div class="feature-item">
                          <div class="feature-title">✨ Ad-Free Audio</div>
                          <div>Pure studio lossless listening without commercial interruptions.</div>
                        </div>
                        <div class="feature-item">
                          <div class="feature-title">📦 Offline Vault</div>
                          <div>Liked songs & custom playlists download automatically.</div>
                        </div>
                      </div>

                      <div class="footer">
                        <strong>Melo Music</strong> • Elevate Every Moment With Sound<br>
                        Thank you for joining our sound universe.
                      </div>
                    </div>
                  </body>
                  </html>
                `
              };

              await transporter.sendMail(mailOptions);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, message: 'Welcome email sent' }));
            } catch (err) {
              console.error('Failed to send welcome email:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to send welcome email', details: err.message }));
            }
          });
        });

        // Ad-free YouTube Video ID Search Resolver
        server.middlewares.use('/api/youtube-search', async (req, res, next) => {
          if (req.method !== 'GET') return next();

          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const q = urlObj.searchParams.get('q');
            if (!q) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Missing query param q' }));
            }

            const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q + ' official audio')}`;
            const ytRes = await fetch(searchUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
              }
            });
            const html = await ytRes.text();
            const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
            const videoId = match ? match[1] : null;

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, videoId }));
          } catch (err) {
            console.error('YouTube search resolver error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });

        // Real Artist Face Portraits Search Resolver (Deezer Label Headshots)
        server.middlewares.use('/api/artist-search', async (req, res, next) => {
          if (req.method !== 'GET') return next();

          try {
            const urlObj = new URL(req.url, 'http://localhost');
            const q = urlObj.searchParams.get('q');
            if (!q) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Missing query param q' }));
            }

            const deezerRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(q)}&limit=15`);
            const data = await deezerRes.json();
            const artists = (data.data || []).map(a => ({
              id: `artist-${a.id}`,
              name: a.name,
              genre: 'World Artist',
              photo: a.picture_xl || a.picture_big || a.picture_medium,
              topSongs: []
            }));

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, artists }));
          } catch (err) {
            console.error('Artist search error:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      }
    }
  ]
});
