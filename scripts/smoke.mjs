import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173';
const seeded = {
  schemaVersion: 3,
  displayName: 'Focus Tester',
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
  winStreak: 0,
  xp: 120,
  level: 2,
  totalWon: 30,
  totalLost: 0,
  biggestWin: 18,
  gamesPlayed: 9,
  history: [],
  challenges: [],
  soundOn: true,
  riskAlerts: true,
  minutesEarnedToday: 0,
  wagerMinutes: 5,
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

async function boot(state) {
  await page.goto(BASE);
  await page.evaluate((s) => localStorage.setItem('screel-v3', JSON.stringify(s)), state);
  await page.goto(BASE);
  await page.waitForTimeout(3400);
}

await boot(seeded);
await page.getByRole('button', { name: 'Play', exact: true }).click();
await page.getByRole('button', { name: /Safe tiles/i }).click();
await page.getByLabel('Minute stake').waitFor();
await page.getByRole('button', { name: '10m' }).click();
await page.getByRole('button', { name: /7 · Intense/i }).click();
await page.getByText('7 hazards').waitFor();
await page.getByRole('button', { name: /Play/ }).click();

await page.getByRole('button', { name: /Multiplier wheel/i }).click();
await page.getByRole('button', { name: /20×/ }).waitFor();
await page.getByRole('button', { name: /Cinematic/i }).waitFor();
await page.getByRole('button', { name: /Play/ }).click();

await page.getByRole('button', { name: /Plinko/i }).click();
await page.getByRole('button', { name: /Drop/i }).waitFor();
await page.getByRole('button', { name: /Play/ }).click();

await page.getByRole('button', { name: /Roll under/i }).click();
await page.evaluate(() => {
  Math.random = () => 0.99;
});
await page.getByRole('button', { name: /Roll for/i }).click();
await page.getByText('230m', { exact: true }).waitFor();
await page.getByRole('button', { name: /Play/ }).click();

await page.getByRole('button', { name: 'You', exact: true }).click();
await page.getByText('App typeface').waitFor();
await page.getByRole('button', { name: 'Stats', exact: true }).click();
await page.getByText('Per-game performance').waitFor();

await browser.close();
console.log('smoke ok');
