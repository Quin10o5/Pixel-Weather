import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'media', 'preview.html');
const outDir = path.join(root, 'media', 'screenshots');

/** Keep in sync with MARKETPLACE_SCENARIO_IDS in src/screenshot/scenarios.ts */
const SCENARIO_IDS = ['snow-moon', 'rain-sun', 'cloudy-dusk'];
const HERO_ID = 'rain-sun';

if (!fs.existsSync(path.join(root, 'dist', 'screenshot', 'capture.js'))) {
  console.error('Missing dist/screenshot/capture.js — run npm run build first.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

for (const entry of fs.readdirSync(outDir)) {
  if (entry.endsWith('.png') && !SCENARIO_IDS.includes(entry.replace(/\.png$/, ''))) {
    fs.unlinkSync(path.join(outDir, entry));
  }
}

const browser = await chromium.launch();
const hashes = new Map();

try {
  for (const id of SCENARIO_IDS) {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 160 },
      deviceScaleFactor: 2,
    });

    try {
      const url = `file://${htmlPath.replace(/\\/g, '/')}?scene=${encodeURIComponent(id)}`;
      await page.goto(url);
      await page.waitForFunction(
        (expected) =>
          document.body.dataset.ready === 'true' &&
          document.body.dataset.scenario === expected,
        id,
        { timeout: 15000 }
      );

      const outPath = path.join(outDir, `${id}.png`);
      const png = await page.locator('#scene').screenshot({ type: 'png' });
      fs.writeFileSync(outPath, png);
      const hash = crypto.createHash('md5').update(png).digest('hex').slice(0, 8);
      hashes.set(id, hash);
      console.log(`Wrote ${outPath} (${hash})`);
    } finally {
      await page.close();
    }
  }

  const defaultPath = path.join(root, 'media', 'screenshot.png');
  fs.copyFileSync(path.join(outDir, `${HERO_ID}.png`), defaultPath);
  console.log(`Wrote ${defaultPath} (from ${HERO_ID})`);
} finally {
  await browser.close();
}

const uniqueHashes = new Set(hashes.values());
console.log(`\n${SCENARIO_IDS.length} marketplace screenshots in media/screenshots/`);
if (uniqueHashes.size < SCENARIO_IDS.length) {
  console.warn(
    `Warning: only ${uniqueHashes.size} unique images — some scenarios may still look identical.`
  );
}
