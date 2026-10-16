import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const sourceLogo = path.join(projectRoot, 'public/icons/logo.png');

if (!fs.existsSync(sourceLogo)) {
  console.error('Source logo not found at:', sourceLogo);
  process.exit(1);
}

const densities = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 }
];

async function generateIcons() {
  console.log('Generating MUSE Android native icons from:', sourceLogo);

  for (const { dir, size } of densities) {
    const targetDir = path.join(projectRoot, 'android/app/src/main/res', dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. Standard square launcher icon
    await sharp(sourceLogo)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // 2. Round launcher icon
    const roundedCorners = Buffer.from(
      `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff" /></svg>`
    );
    await sharp(sourceLogo)
      .resize(size, size, { fit: 'cover' })
      .composite([{ input: roundedCorners, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // 3. Foreground icon for adaptive icons
    await sharp(sourceLogo)
      .resize(Math.round(size * 0.72), Math.round(size * 0.72), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: Math.round(size * 0.14),
        bottom: Math.round(size * 0.14),
        left: Math.round(size * 0.14),
        right: Math.round(size * 0.14),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .resize(size, size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`  ✓ Generated ${dir} (${size}x${size})`);
  }

  // Generate splash screen with centered MUSE logo on #EBEBE9 luxury cream background
  const splashDirs = [
    { dir: 'drawable', width: 480, height: 800, logoSize: 140 },
    { dir: 'drawable-port-mdpi', width: 320, height: 480, logoSize: 100 },
    { dir: 'drawable-port-hdpi', width: 480, height: 800, logoSize: 150 },
    { dir: 'drawable-port-xhdpi', width: 720, height: 1280, logoSize: 220 },
    { dir: 'drawable-port-xxhdpi', width: 960, height: 1600, logoSize: 280 },
    { dir: 'drawable-port-xxxhdpi', width: 1280, height: 1920, logoSize: 340 }
  ];

  console.log('\nGenerating MUSE Android native splash screens...');
  for (const { dir, width, height, logoSize } of splashDirs) {
    const targetDir = path.join(projectRoot, 'android/app/src/main/res', dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const resizedLogo = await sharp(sourceLogo)
      .resize(logoSize, logoSize, { fit: 'contain' })
      .toBuffer();

    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 235, g: 235, b: 233, alpha: 1 } // #EBEBE9
      }
    })
      .composite([
        {
          input: resizedLogo,
          top: Math.round((height - logoSize) / 2),
          left: Math.round((width - logoSize) / 2)
        }
      ])
      .png()
      .toFile(path.join(targetDir, 'splash.png'));

    console.log(`  ✓ Generated ${dir}/splash.png (${width}x${height})`);
  }

  console.log('Successfully generated all Android MUSE launcher, adaptive, and splash screens!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
