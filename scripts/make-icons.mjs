// Renders the app icon SVG into the PNG sizes iOS/Android expect, using the bundled Chromium.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public/favicon.svg'), 'utf8');
const flat = svg.replace('rx="112"', 'rx="0"'); // iOS rounds the corners itself
// Maskable icons need a safe zone: full-bleed background, mark scaled into the middle 80%.
const maskable = flat.replace('<g id="mark">', '<g id="mark" transform="translate(51.2 51.2) scale(.8)">');

// Android: a circular legacy icon, and an adaptive-icon foreground (transparent, mark kept inside the safe zone).
const round = svg.replace('<rect width="512" height="512" rx="112" fill="#1C1B19"/>', '<circle cx="256" cy="256" r="256" fill="#1C1B19"/>');
const foreground = svg
  .replace('<rect width="512" height="512" rx="112" fill="#1C1B19"/>', '')
  .replace('<g id="mark">', '<g id="mark" transform="translate(64 64) scale(.75)">');

const web = 'public';
const res = 'android/app/src/main/res';
const targets = [
  [web, 'icons/icon-192.png', 192, svg],
  [web, 'icons/icon-512.png', 512, svg],
  [web, 'icons/icon-maskable-512.png', 512, maskable],
  [web, 'icons/apple-touch-icon.png', 180, flat],
];
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(densities)) {
  targets.push([res, `mipmap-${d}/ic_launcher.png`, 48 * k, svg]);
  targets.push([res, `mipmap-${d}/ic_launcher_round.png`, 48 * k, round]);
  targets.push([res, `mipmap-${d}/ic_launcher_foreground.png`, 108 * k, foreground]);
}

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [dir, file, size, markup] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: join(root, dir, file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', file);
}
await browser.close();
