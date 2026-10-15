import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputPath = 'C:/Users/lenovo/.gemini/antigravity-ide/brain/306f0c8a-897a-4b93-8d3f-0c13ec4c5f2f/.user_uploaded/media_1792073272450.jpg';

async function run() {
  if (!fs.existsSync(inputPath)) {
    console.error('Input image not found at', inputPath);
    process.exit(1);
  }

  // Ensure directories exist
  if (!fs.existsSync('public/icons')) fs.mkdirSync('public/icons', { recursive: true });
  if (!fs.existsSync('src/assets')) fs.mkdirSync('src/assets', { recursive: true });

  console.log('1. Writing high-res master logos...');
  await sharp(inputPath).png({ quality: 100 }).toFile('src/assets/logo.png');
  await sharp(inputPath).png({ quality: 100 }).toFile('public/icons/logo.png');

  console.log('2. Generating PWA icons (512x512, 192x192)...');
  await sharp(inputPath).resize(512, 512).png().toFile('public/icons/icon-512.png');
  await sharp(inputPath).resize(192, 192).png().toFile('public/icons/icon-192.png');

  console.log('3. Generating Favicons (64x64, 32x32)...');
  await sharp(inputPath).resize(64, 64).png().toFile('public/favicon.png');
  await sharp(inputPath).resize(32, 32).png().toFile('public/favicon.ico');

  console.log('4. Generating Transparent Badge (cutout)...');
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.from(data);
  const w = info.width;
  const h = info.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      const dx = (x - w / 2) / (w / 2);
      const dy = (y - h / 2) / (h / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Outside badge area where color is light clouds
      if (dist > 0.44 && r > 180 && g > 180 && b > 180) {
        out[idx + 3] = 0;
      } else if (dist > 0.39 && r > 195 && g > 195 && b > 195) {
        const factor = Math.max(0, Math.min(1, (225 - r) / 30));
        out[idx + 3] = Math.round(factor * 255);
      }
    }
  }

  await sharp(out, { raw: info }).png().toFile('src/assets/logo-badge.png');
  await sharp(out, { raw: info }).png().toFile('public/icons/logo-badge.png');
  await sharp(out, { raw: info }).resize(192, 192).png().toFile('public/icons/logo-badge-192.png');
  await sharp(out, { raw: info }).resize(64, 64).png().toFile('public/icons/logo-badge-64.png');

  console.log('All icons generated successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
