import nodemailer from 'nodemailer';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, code, name } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ error: 'Missing email or OTP code' });
    }

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;

    if (!emailUser || !emailPass) {
      return res.status(500).json({ error: 'Server email credentials not configured in environment' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    const mailOptions = {
      from: `"MUSE" <${emailUser}>`,
      to: email,
      subject: `${code} is your MUSE verification code`,
      priority: 'high',
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      },
      text: `Hello ${name || 'Music Lover'},\n\nYour MUSE verification code is: ${code}\n\nUse this code to complete your sign-up and sync your favorite artists, playlists, and lossless music vault.\nThis code will expire in 10 minutes.\n\n— MUSE Music Architecture`,
      attachments: [
        {
          filename: 'melo-logo.png',
          path: path.resolve(process.cwd(), 'public/icons/logo.png'),
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
    return res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Serverless send-otp error:', err);
    return res.status(500).json({ error: 'Failed to send OTP email', details: err.message });
  }
}
