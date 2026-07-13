export type RouletteColor = 'red' | 'black' | 'green';

export type SpotId =
  | `n-${number}`
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low'
  | 'high'
  | 'dozen-1'
  | 'dozen-2'
  | 'dozen-3'
  | 'col-1'
  | 'col-2'
  | 'col-3';

export interface SpinResult {
  number: number;
  color: RouletteColor;
}

const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export function colorOf(n: number): RouletteColor {
  if (n === 0) return 'green';
  return REDS.has(n) ? 'red' : 'black';
}

export function spinWheel(): SpinResult {
  const number = Math.floor(Math.random() * 37);
  return { number, color: colorOf(number) };
}

/** Profit multiplier only (stake returned separately on win). */
export function profitOdds(spot: SpotId): number {
  if (spot.startsWith('n-')) return 35;
  if (spot.startsWith('dozen-') || spot.startsWith('col-')) return 2;
  return 1;
}

export function spotWins(spot: SpotId, result: SpinResult): boolean {
  const n = result.number;
  if (spot.startsWith('n-')) return n === Number(spot.slice(2));
  if (n === 0) return false;
  if (spot === 'red') return result.color === 'red';
  if (spot === 'black') return result.color === 'black';
  if (spot === 'even') return n % 2 === 0;
  if (spot === 'odd') return n % 2 === 1;
  if (spot === 'low') return n >= 1 && n <= 18;
  if (spot === 'high') return n >= 19 && n <= 36;
  if (spot === 'dozen-1') return n >= 1 && n <= 12;
  if (spot === 'dozen-2') return n >= 13 && n <= 24;
  if (spot === 'dozen-3') return n >= 25 && n <= 36;
  if (spot === 'col-1') return n % 3 === 1;
  if (spot === 'col-2') return n % 3 === 2;
  if (spot === 'col-3') return n % 3 === 0;
  return false;
}

/** Total returned to player for a winning bet (stake + profit). */
export function payoutForBet(amount: number, spot: SpotId, result: SpinResult): number {
  if (!spotWins(spot, result)) return 0;
  return amount + amount * profitOdds(spot);
}

export function spotLabel(spot: SpotId): string {
  if (spot.startsWith('n-')) return spot.slice(2);
  const labels: Record<string, string> = {
    red: 'RED',
    black: 'BLACK',
    even: 'EVEN',
    odd: 'ODD',
    low: '1–18',
    high: '19–36',
    'dozen-1': '1st 12',
    'dozen-2': '2nd 12',
    'dozen-3': '3rd 12',
    'col-1': '2:1',
    'col-2': '2:1',
    'col-3': '2:1',
  };
  return labels[spot] ?? spot;
}

/** Wheel order used for animation positioning */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
  31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

/** Classic European layout rows (top → bottom): 3,2,1 */
export const TABLE_ROWS: number[][] = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34],
];

export const CHIP_VALUES = [1, 2, 5, 10, 25] as const;
