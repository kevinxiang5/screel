import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_URL ?? 'http://localhost:4173';

function pad(n) {
  return String(n).padStart(2, '0');
}

function localDayKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function shiftLocalDay(key, delta) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return localDayKey(dt);
}

const day = localDayKey();
const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

const seeded = {
  schemaVersion: 4,
  displayName: 'Focus Tester',
  connected: false,
  usageSource: 'none',
  ageVerified: true,
  ageBlocked: false,
  setupComplete: true,
  guideComplete: true,
  guideTipTab: null,
  focusGoal: 'focus',
  distractions: ['social'],
  fontTheme: 'felt',
  baseLimit: 240,
  minutesBank: 240,
  minutesUsed: 35,
  resetHour: 0,
  resetMinute: 0,
  timeZone: tz,
  activePeriodId: `${day}T00:00@${tz}`,
  streak: 2,
  winStreak: 0,
  xp: 120,
  level: 2,
  totalWon: 30,
  totalLost: 0,
  biggestWin: 18,
  gamesPlayed: 9,
  history: [
    {
      id: 'h1',
      game: 'dice',
      delta: -10,
      result: 'lose',
      detail: 'Smoke lose',
      at: Date.now() - 60_000,
    },
  ],
  challenges: [
    {
      id: 'clear-3',
      title: 'Three Puzzles',
      description: 'Clear 3 skill puzzles today',
      progress: 1,
      target: 3,
      reward: 8,
      claimed: false,
    },
  ],
  soundOn: true,
  riskAlerts: true,
  minutesEarnedToday: 4,
  puzzleEarnedToday: 4,
  lastPuzzleAt: 0,
  usageDayLog: [
    { day, used: 35, bank: 240, puzzleEarned: 4, stakeNet: -10 },
    { day: shiftLocalDay(day, -1), used: 80, bank: 240, puzzleEarned: 6, stakeNet: 0 },
  ],
  wagerMinutes: 5,
  bankPinHash: null,
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(20_000);

async function boot(state) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => {
    localStorage.clear();
    localStorage.setItem('screel-v3', JSON.stringify(s));
  }, state);
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.locator('.brand-mark, .display.xl').first().waitFor({ timeout: 15_000 });
}

function tab(name) {
  return page.locator('.tab-bar').getByRole('button', { name, exact: true });
}

async function expectNoCrash() {
  assert.equal(await page.getByText('Something went wrong').count(), 0);
}

await boot(seeded);

// HOME
await tab('Home').click();
await page.getByText('min left').waitFor();
await page.getByText('Used today').waitFor();
await page.getByText('35m').first().waitFor();
await expectNoCrash();

// EARN
await tab('Earn').click();
await page.getByRole('heading', { name: 'Earn' }).waitFor();
await page.getByText(/Skill puzzles pay fixed minutes/i).waitFor();
await page.getByText(/Earned from puzzles today/i).waitFor();
await expectNoCrash();

// PLAY
await tab('Play').click();
await page.getByRole('heading', { name: 'Choose your spot' }).waitFor();

await page.getByRole('button', { name: /Safe tiles/i }).click();
await page.getByLabel('Minute stake').waitFor();
await page.getByRole('button', { name: '10m' }).click();
await page.getByRole('button', { name: /7 · Intense/i }).click();
await page.getByText('7 hazards').waitFor();
await page.getByRole('button', { name: /^Play$/ }).click();

await page.getByRole('button', { name: /Multiplier wheel/i }).click();
await page.getByRole('button', { name: /20×/ }).waitFor();
await page.getByRole('button', { name: /Cinematic/i }).waitFor();
await page.getByRole('button', { name: /^Play$/ }).click();

await page.getByRole('button', { name: /Plinko/i }).click();
await page.getByRole('button', { name: /Drop/i }).first().waitFor();
await page.getByRole('button', { name: /^Play$/ }).click();

await page.getByRole('button', { name: /Roll under/i }).click();
await page.getByLabel('Minute stake').waitFor();
await page.getByRole('button', { name: '10m' }).click();
await page.evaluate(() => {
  Math.random = () => 0.99;
});
await page.getByRole('button', { name: /Roll for/i }).click();
await page.getByText(/lost 10m/i).waitFor();
await page.getByText('195m', { exact: true }).waitFor();
await page.getByRole('button', { name: /^Play$/ }).click();
await expectNoCrash();

// STATS
await tab('Stats').click();
await page.getByRole('heading', { name: 'Stats' }).waitFor();
await page.getByText('Unused allowance today').waitFor();
await page.getByText('Calendar heat').waitFor();
await page.getByText('Last 7 days').waitFor();
await page.getByText(/Days follow your reset clock/i).waitFor();
await page.locator('.heatmap-cell.today').waitFor();
await page.locator('.week-bars .week-bar').first().waitFor();
await page.getByRole('button', { name: 'Show' }).click();
await page.locator('.history-item').filter({ hasText: 'Smoke lose' }).filter({ hasText: '-10m' }).waitFor();
await expectNoCrash();

// YOU
await tab('You').click();
await page.getByRole('heading', { name: 'You' }).waitFor();
await page.getByText('Display name').waitFor();
await page.getByText('Personalize').waitFor();
await page.getByText('Connection').waitFor();
await page.getByRole('button', { name: /Connect Screen Time|Screen Time linked/i }).waitFor();
await expectNoCrash();

await browser.close();
console.log('smoke ok: home, earn, play, stats, you');
