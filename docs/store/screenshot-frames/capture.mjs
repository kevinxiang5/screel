import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const html = path.join(root, 'docs/store/screenshot-frames/index.html');
const phoneDir = 'C:/Users/good/Desktop/Screel-App-Store-Screenshots/asc-sized';
const padDir = 'C:/Users/good/Desktop/Screel-App-Store-Screenshots/ipad-sized';
fs.mkdirSync(phoneDir, { recursive: true });
fs.mkdirSync(padDir, { recursive: true });

const phones = {
  s1: 'screel-asc-01-bank.png',
  s2: 'screel-asc-02-home.png',
  s3: 'screel-asc-03-play.png',
  s4: 'screel-asc-04-stats.png',
  s5: 'screel-asc-05-dual-home-play.png',
  s6: 'screel-asc-06-dual-bank-stats.png',
};

const pads = {
  p1: 'screel-ipad-01-bank.png',
  p2: 'screel-ipad-02-home.png',
  p3: 'screel-ipad-03-play-home.png',
  p4: 'screel-ipad-04-bank-stats.png',
};

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 2048, height: 2778 },
  deviceScaleFactor: 1,
});
const url = 'file:///' + html.replace(/\\/g, '/');
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

for (const [id, file] of Object.entries(phones)) {
  const el = await page.$(`#${id}`);
  if (!el) throw new Error('missing ' + id);
  const out = path.join(phoneDir, file);
  await el.screenshot({ path: out, type: 'png' });
  console.log('wrote', out);
}

for (const [id, file] of Object.entries(pads)) {
  const el = await page.$(`#${id}`);
  if (!el) throw new Error('missing ' + id);
  const out = path.join(padDir, file);
  await el.screenshot({ path: out, type: 'png' });
  console.log('wrote', out);
}

await browser.close();
console.log('done');
