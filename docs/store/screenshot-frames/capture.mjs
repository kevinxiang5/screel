import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const html = path.join(root, 'docs/store/screenshot-frames/index.html');
const outDir = 'C:/Users/good/Desktop/Screel-App-Store-Screenshots/asc-sized';
fs.mkdirSync(outDir, { recursive: true });

const names = {
  s1: 'screel-asc-01-home.png',
  s2: 'screel-asc-02-play.png',
  s3: 'screel-asc-03-bank.png',
  s4: 'screel-asc-04-stats.png',
  s5: 'screel-asc-05-dual-home-play.png',
  s6: 'screel-asc-06-dual-bank-stats.png',
};

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1284, height: 2778 },
  deviceScaleFactor: 1,
});
const url = 'file:///' + html.replace(/\\/g, '/');
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

for (const [id, file] of Object.entries(names)) {
  const el = await page.$(`#${id}`);
  if (!el) throw new Error('missing ' + id);
  const out = path.join(outDir, file);
  await el.screenshot({ path: out, type: 'png' });
  console.log('wrote', out);
}

await browser.close();
console.log('done');
