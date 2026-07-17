// Dev smoke test: seed a ready state, screenshot the new floor + games + ad rescue.
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173';
const OUT = 'docs/store/screenshots/smoke';

const seeded = {
  displayName: 'High Roller',
  connected: false,
  usageSource: 'none',
  ageVerified: true,
  ageBlocked: false,
  setupComplete: true,
  fontTheme: 'felt',
  baseLimit: 240,
  minutesBank: 240,
  minutesUsed: 0,
  resetHour: 4,
  resetMinute: 0,
  timeZone: 'America/Los_Angeles',
  activePeriodId: 'seeded',
  streak: 2,
  xp: 120,
  level: 2,
  totalWon: 30,
  totalLost: 12,
  biggestWin: 18,
  gamesPlayed: 9,
  history: [],
  challenges: [],
  soundOn: true,
  riskAlerts: true,
  adRescuesUsed: 0,
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

async function boot(state) {
  await page.goto(BASE);
  await page.evaluate((s) => localStorage.setItem('screel-v2', JSON.stringify(s)), state);
  await page.goto(BASE);
  await page.waitForTimeout(3600); // loading screen
}

await boot(seeded);
await page.getByText('Enter the floor').click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/floor.png` });

for (const game of ['Mines', 'Crash', 'Slots', 'Hi-Lo', 'Dice']) {
  await page.getByRole('button', { name: new RegExp(game, 'i') }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${game.toLowerCase().replace('-', '')}.png` });
  await page.getByText('Floor').click();
  await page.waitForTimeout(400);
}

// Broke state → ad rescue card + player.
// Reuse the app-written period id so the auto-reset doesn't refill the bank.
const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('screel-v2')));
await boot({ ...persisted, minutesBank: 2, minutesUsed: 0, adRescuesUsed: 0 });
await page.getByText('Enter the floor').click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/floor-broke.png` });
await page.getByText('Watch ad').click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/ad-player.png` });

await browser.close();
console.log('smoke ok');
