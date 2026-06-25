import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'media', 'preview.html');
const outPath = path.join(root, 'media', 'screenshot.png');

if (!fs.existsSync(path.join(root, 'dist', 'screenshot', 'capture.js'))) {
  console.error('Missing dist/screenshot/capture.js — run npm run build first.');
  process.exit(1);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 160 },
    deviceScaleFactor: 2,
  });
  await page.goto(`file://${htmlPath.replace(/\\/g, '/')}?scene=rain-sun`);
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, {
    timeout: 10000,
  });
  const pngBase64 = await page.evaluate(() => {
    const canvas = document.getElementById('scene');
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('Missing #scene canvas');
    }
    return canvas.toDataURL('image/png').split(',')[1];
  });
  fs.writeFileSync(outPath, Buffer.from(pngBase64, 'base64'));
  console.log(`Wrote ${outPath}`);
} finally {
  await browser.close();
}
