/** Stake-style Plinko risk modes (easy = low, hard = high). */
export type PlinkoRisk = 'easy' | 'medium' | 'hard';

/** Stake multiplier tables (symmetric), scaled to ~12% house edge (×0.8889). */
const STAKE_8_LOW = [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6];
const STAKE_12_MED = [33, 11, 4, 2, 0.6, 0.4, 0.3, 0.4, 0.6, 2, 4, 11, 33];
const STAKE_16_HIGH = [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000];

const HOUSE_SCALE = 0.88 / 0.99;

function scaleMult(value: number): number {
  const scaled = value * HOUSE_SCALE;
  if (scaled >= 100) return Math.round(scaled);
  if (scaled >= 10) return Math.round(scaled * 10) / 10;
  if (scaled >= 1) return Math.round(scaled * 100) / 100;
  return Math.round(scaled * 1000) / 1000;
}

function scaleTable(table: number[]): number[] {
  return table.map(scaleMult);
}

export interface PlinkoMode {
  risk: PlinkoRisk;
  label: string;
  blurb: string;
  rows: number;
  mults: readonly number[];
}

export const PLINKO_MODES: Record<PlinkoRisk, PlinkoMode> = {
  easy: {
    risk: 'easy',
    label: 'Easy',
    blurb: '8 rows · steady',
    rows: 8,
    mults: scaleTable(STAKE_8_LOW),
  },
  medium: {
    risk: 'medium',
    label: 'Medium',
    blurb: '12 rows · balanced',
    rows: 12,
    mults: scaleTable(STAKE_12_MED),
  },
  hard: {
    risk: 'hard',
    label: 'Hard',
    blurb: '16 rows · volatile',
    rows: 16,
    mults: scaleTable(STAKE_16_HIGH),
  },
};

/** @deprecated use PLINKO_MODES */
export const PLINKO_ROWS = PLINKO_MODES.easy.rows;
/** @deprecated use PLINKO_MODES */
export const PLINKO_MULTS = PLINKO_MODES.easy.mults;

function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i += 1) r = (r * (n - k + i)) / i;
  return r;
}

export function plinkoChance(rows: number, bin: number): number {
  const total = 2 ** rows;
  return (binom(rows, bin) / total) * 100;
}

/** Each row: 50/50 left or right — classic Plinko path. */
export function dropPlinko(rows: number): { bin: number; path: number[] } {
  const path: number[] = [0];
  let pos = 0;
  for (let row = 0; row < rows; row += 1) {
    pos += Math.random() < 0.5 ? 0 : 1;
    path.push(pos);
  }
  return { bin: pos, path };
}

export function plinkoExpectedMult(rows: number, mults: readonly number[]): number {
  const total = 2 ** rows;
  let sum = 0;
  for (let k = 0; k < mults.length; k += 1) {
    sum += (binom(rows, k) / total) * mults[k];
  }
  return sum;
}

export function formatPlinkoMult(mult: number): string {
  if (mult >= 100) return `${Math.round(mult)}×`;
  if (mult >= 10) return `${mult % 1 === 0 ? mult : mult.toFixed(1)}×`;
  if (mult >= 1) return `${mult % 1 === 0 ? mult : mult.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`;
  return `${mult.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}×`;
}
