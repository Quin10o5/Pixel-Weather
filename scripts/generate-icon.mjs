import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = path.join(root, 'media', 'icon.svg');
const outPath = path.join(root, 'media', 'icon.png');

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 128px; height: 128px; background: #1e1e1e; }
  body { display: flex; align-items: center; justify-content: center; color: #ffd028; }
  svg { width: 96px; height: 96px; }
</style></head>
<body>${await (await import('node:fs/promises')).readFile(svgPath, 'utf8')}</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 128, height: 128 } });
  await page.setContent(html);
  await page.locator('svg').screenshot({ path: outPath, type: 'png' });
  console.log(`Wrote ${outPath}`);
} finally {
  await browser.close();
}
