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
                ? artists.map(a => {
                    const aName = typeof a === 'string' ? a : (a.name || 'Artist');
                    return `
                      <tr style="border-bottom: 1px solid rgba(0, 0, 0, 0.05);">
                        <td style="padding: 11px 12px; width: 30px; vertical-align: middle;">
                          <div style="width: 24px; height: 24px; border-radius: 50%; background: #E8F5E9; color: #1E7227; font-size: 13px; font-weight: 800; line-height: 24px; text-align: center;">✓</div>
                        </td>
                        <td style="padding: 11px 0; vertical-align: middle;">
                          <div style="font-size: 14px; font-weight: 700; color: #111111; letter-spacing: 0.2px;">${aName}</div>
                          <div style="font-size: 11.5px; color: #74747A; margin-top: 2px;">Selected Artist • Personalized Sound Calibration</div>
                        </td>
                        <td style="padding: 11px 12px; text-align: right; vertical-align: middle;">
                          <span style="display: inline-block; background: #E8F5E9; color: #1E7227; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">✓ Synced</span>
                        </td>
                      </tr>
                    `;
                  }).join('')
                : `
                  <tr>
                    <td style="padding: 11px 12px; width: 30px; vertical-align: middle;">
                      <div style="width: 24px; height: 24px; border-radius: 50%; background: #E8F5E9; color: #1E7227; font-size: 13px; font-weight: 800; line-height: 24px; text-align: center;">✓</div>
                    </td>
                    <td style="padding: 11px 0; vertical-align: middle;">
                      <div style="font-size: 14px; font-weight: 700; color: #111111;">Global Master Audio Catalog</div>
                      <div style="font-size: 11.5px; color: #74747A;">Full high-definition streaming access</div>
                    </td>
                    <td style="padding: 11px 12px; text-align: right; vertical-align: middle;">
                      <span style="display: inline-block; background: #E8F5E9; color: #1E7227; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 12px;">✓ Active</span>
                    </td>
                  </tr>
                `;

              const mailOptions = {
                from: '"Melo Music" <primemonexa@gmail.com>',
                to: email,
                subject: `Welcome to Melo, ${name || 'Music Lover'} — Your High-Fidelity Sound Sanctuary Is Ready`,
                attachments: [
                  {
                    filename: 'melo-logo.png',
                    path: path.resolve(__dirname, 'public/icons/logo.png'),
                    cid: 'melologo'
                  }
                ],
                html: `
                  <!DOCTYPE html>
                  <html lang="en">
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Welcome to Melo</title>
                    <style>
                      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #EBEBE9; margin: 0; padding: 32px 12px; color: #121212; -webkit-font-smoothing: antialiased; }
                      .wrapper { max-width: 620px; margin: 0 auto; background: #FFFFFF; border-radius: 32px; padding: 44px 36px; box-shadow: 0 16px 40px rgba(0,0,0,0.06); border: 1px solid rgba(0,0,0,0.06); }
                      .logo-wrap { text-align: center; margin-bottom: 24px; }
                      .badge-tag { display: inline-block; background: rgba(0,0,0,0.05); color: #55555B; padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 12px; }
                      h1 { font-size: 27px; font-weight: 800; margin: 0 0 10px; color: #111111; letter-spacing: -0.6px; line-height: 1.25; }
                      .lead { font-size: 15px; line-height: 1.6; color: #55555B; margin: 0 0 28px; }
                      .section-card { background: #F8F8F7; border: 1px solid rgba(0,0,0,0.06); border-radius: 22px; padding: 22px 20px; margin: 26px 0; }
                      .section-header { font-size: 11.5px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; color: #74747A; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
                      .features-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; margin: 10px 0; }
                      .feature-cell { background: #FFFFFF; border: 1px solid rgba(0,0,0,0.06); border-radius: 18px; padding: 18px; vertical-align: top; }
                      .feature-icon-title { font-size: 14.5px; font-weight: 800; color: #111111; margin-bottom: 5px; }
                      .feature-desc { font-size: 12.5px; line-height: 1.5; color: #66666E; margin: 0; }
                      .tips-box { background: #F2F4F2; border-left: 4px solid #1E7227; border-radius: 14px; padding: 16px 18px; margin: 24px 0; text-align: left; }
                      .tips-title { font-size: 13px; font-weight: 800; color: #1E7227; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
                      .tips-desc { font-size: 12.5px; line-height: 1.55; color: #333333; margin: 0; }
                      .cta-box { text-align: center; margin: 32px 0 24px; }
                      .btn-cta { display: inline-block; background: #111111; color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 34px; border-radius: 30px; letter-spacing: 0.2px; box-shadow: 0 6px 18px rgba(0,0,0,0.18); }
                      .signoff { font-size: 13.5px; line-height: 1.6; color: #55555B; margin-top: 32px; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 24px; }
                      .footer { font-size: 11px; line-height: 1.6; color: #9E9EA4; margin-top: 24px; text-align: center; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 18px; }
                    </style>
                  </head>
                  <body>
                    <div class="wrapper">
                      <!-- Brand Logo Header -->
                      <div class="logo-wrap">
                        <img src="cid:melologo" width="82" height="82" alt="Melo Logo" style="display: block; margin: 0 auto; border-radius: 24px; box-shadow: 0 10px 28px rgba(0,0,0,0.14);" />
                        <div style="margin-top: 14px;">
                          <span class="badge-tag">Official Member Onboarding</span>
                        </div>
                      </div>

                      <!-- Executive Welcome Headline -->
                      <h1 style="text-align: center;">Welcome to Melo, ${name || 'Music Lover'}</h1>
                      <p class="lead" style="text-align: center;">
                        Your personalized sound sanctuary has been crafted and tuned to perfection. We are thrilled to welcome you to a distraction-free, studio-grade listening experience designed around what matters most: the music.
                      </p>

                      <!-- Section 1: Selected Artists Checklist with Ticks -->
                      <div class="section-card">
                        <div class="section-header">
                          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #1E7227;"></span>
                          Your Selected Artist Foundation
                        </div>
                        <p style="font-size: 12.5px; color: #66666E; margin: 0 0 14px; line-height: 1.45;">
                          Your sound universe is algorithmically centered around your personally chosen artists. Your Daily Mixes, Heavy Rotation stream, and Discovery Radios are now synchronized:
                        </p>
                        <table style="width: 100%; border-collapse: collapse; background: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06);">
                          ${artistListHtml}
                        </table>
                      </div>

                      <!-- Section 2: Comprehensive Guide to What You Now Have -->
                      <div style="margin: 32px 0 20px;">
                        <div style="font-size: 11.5px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800; color: #74747A; margin-bottom: 8px;">
                          Your Complete Suite of Privileges
                        </div>
                        <h2 style="font-size: 20px; font-weight: 800; color: #111111; margin: 0 0 18px;">Everything Included With Your Account</h2>

                        <table class="features-table">
                          <tr>
                            <td class="feature-cell" style="width: 50%; padding-right: 14px;">
                              <div class="feature-icon-title">✨ 100% Ad-Free Audio</div>
                              <p class="feature-desc">Stream millions of master tracks without a single advertisement, commercial break, or sponsored popup. Pure, uninterrupted listening from start to finish.</p>
                            </td>
                            <td class="feature-cell" style="width: 50%;">
                              <div class="feature-icon-title">📦 Automated Offline Vault</div>
                              <p class="feature-desc">Every track you tap the heart on automatically downloads to your device in high-speed local storage. Listen on flights or off-grid with zero data usage.</p>
                            </td>
                          </tr>
                          <tr>
                            <td class="feature-cell" style="width: 50%; padding-right: 14px;">
                              <div class="feature-icon-title">🎛️ 5-Band Studio Equalizer</div>
                              <p class="feature-desc">Engineered Web Audio acoustic frequency shaping. Choose from Bass Boost, Vocal Clarity, Acoustic, Electronic, Rock, or sculpt your own custom curve.</p>
                            </td>
                            <td class="feature-cell" style="width: 50%;">
                              <div class="feature-icon-title">🎤 Live Scrolling Lyrics</div>
                              <p class="feature-desc">Real-time syllable-synchronized lyrics tracking line-by-line as the artist sings, with auto-scroll and manual timing calibration for full sing-along immersion.</p>
                            </td>
                          </tr>
                          <tr>
                            <td class="feature-cell" style="width: 50%; padding-right: 14px;">
                              <div class="feature-icon-title">💫 Fluid Circular Playhead</div>
                              <p class="feature-desc">Interactive circular orbit scrubber with pause-on-drag precision seeking, loop modes, repeat-one, and smart anti-repetition shuffle algorithms.</p>
                            </td>
                            <td class="feature-cell" style="width: 50%;">
                              <div class="feature-icon-title">📁 Local Device Music & Playlists</div>
                              <p class="feature-desc">Seamlessly import local audio files from your phone or laptop alongside global streaming, and assemble custom playlists with quick search-and-add drawers.</p>
                            </td>
                          </tr>
                        </table>
                      </div>

                      <!-- Section 3: Essential Pro Tips -->
                      <div class="tips-box">
                        <div class="tips-title">💡 3 Quick Tips to Get Started</div>
                        <ul style="margin: 6px 0 0; padding-left: 18px; font-size: 12.5px; line-height: 1.55; color: #2E332E;">
                          <li style="margin-bottom: 4px;"><strong>Instant Offline Save:</strong> Tap the heart icon on any playing song — it will immediately start caching with live spinner feedback.</li>
                          <li style="margin-bottom: 4px;"><strong>Sound Sculpting:</strong> Tap the equalizer sliders icon on the top right of the player to enhance the bass or vocal clarity.</li>
                          <li><strong>Install to Home Screen:</strong> Add Melo as a PWA on your mobile browser for a native full-screen app experience with gesture navigation.</li>
                        </ul>
                      </div>

                      <!-- CTA Button -->
                      <div class="cta-box">
                        <a href="https://melomusic.vercel.app" class="btn-cta">Open Melo & Start Listening</a>
                      </div>

                      <!-- Executive Signoff -->
                      <div class="signoff">
                        We built Melo with the belief that music is not just background noise — it is an emotional sanctuary. Thank you for making Melo your sound home.<br><br>
                        <strong>Warm regards,</strong><br>
                        The Melo Sound Engineering & Acoustic Architecture Team
                      </div>

                      <!-- Footer -->
                      <div class="footer">
                        © 2026 Melo Music Inc. All rights reserved. • High-Fidelity Audio Architecture<br>
                        This confirmation was dispatched because your account completed the Melo universe onboarding.<br>
                        Melo Music • Designed with luxury minimalism & zero compromises.
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
