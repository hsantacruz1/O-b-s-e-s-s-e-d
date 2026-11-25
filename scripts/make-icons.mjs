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

const targets = [
  ['icons/icon-192.png', 192, svg],
  ['icons/icon-512.png', 512, svg],
  ['icons/icon-maskable-512.png', 512, maskable],
  ['icons/apple-touch-icon.png', 180, flat],
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [file, size, markup] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: join(root, 'public', file), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log('wrote', file);
}
await browser.close();
