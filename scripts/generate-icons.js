import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, '../public');
const iconsDir = path.join(publicDir, 'icons');
const svgPath = path.join(publicDir, 'favicon.svg');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function createIconWithBackground(width, height, logoSize, outputPath) {
  try {
    const logoBuffer = await sharp(svgPath)
      .resize(logoSize, logoSize)
      .toBuffer();

    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 20, g: 21, b: 23, alpha: 1 } // #141517 Brand Background
      }
    })
      .composite([{ input: logoBuffer, gravity: 'center' }])
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated: ${path.relative(publicDir, outputPath)} (${width}x${height})`);
  } catch (error) {
    console.error(`✗ Error generating ${outputPath}:`, error);
  }
}

async function generateAllIcons() {
  console.log('Generating complete premium UĞRA PWA & Favicon asset suite...');

  // 1. Apple Touch Icon (180x180) - both root and icons/ folder for bulletproof loading
  await createIconWithBackground(180, 180, 130, path.join(publicDir, 'apple-touch-icon.png'));
  await createIconWithBackground(180, 180, 130, path.join(iconsDir, 'apple-touch-icon.png'));

  // 2. Android Chrome Icons (192x192 & 512x512)
  await createIconWithBackground(192, 192, 140, path.join(publicDir, 'android-chrome-192x192.png'));
  await createIconWithBackground(512, 512, 380, path.join(publicDir, 'android-chrome-512x512.png'));

  // 3. PWA App Icons (192x192 & 512x512) - Transparent or dark background depending on standard
  // We make standard any/maskable icons dark backgrounds to look exactly like the premium brand logo
  await createIconWithBackground(192, 192, 140, path.join(iconsDir, 'icon-192.png'));
  await createIconWithBackground(512, 512, 380, path.join(iconsDir, 'icon-512.png'));
  await createIconWithBackground(512, 512, 340, path.join(iconsDir, 'icon-maskable-512.png'));

  // 4. Favicons
  await createIconWithBackground(16, 16, 12, path.join(publicDir, 'favicon-16x16.png'));
  await createIconWithBackground(32, 32, 24, path.join(publicDir, 'favicon-32x32.png'));
  
  // favicon.ico - Multi-resolution or high-res 48x48 / 32x32 PNG renamed is standard and highly reliable
  await createIconWithBackground(48, 48, 36, path.join(publicDir, 'favicon.ico'));

  console.log('✓ All PWA and platform icons generated successfully!');
}

generateAllIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
