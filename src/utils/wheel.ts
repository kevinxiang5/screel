export interface WheelTier {
  mult: number;
  count: number;
  color: string;
  label: string;
}

/**
 * Bandit-style multiplier wheel. Rarer tiers pay more.
 * Counts sum to 24 segments; each tier keeps a house edge of ~12–17%
 * (probability × multiplier < 1), so staking screen time is a real risk.
 */
export const WHEEL_TIERS: WheelTier[] = [
  { mult: 2, count: 10, color: '#2f6fed', label: '2×' },
  { mult: 3, count: 7, color: '#e0a90f', label: '3×' },
  { mult: 5, count: 4, color: '#8b5cf6', label: '5×' },
  { mult: 10, count: 2, color: '#22c55e', label: '10×' },
  { mult: 20, count: 1, color: '#ef4444', label: '20×' },
];

/** Fixed segment order (length 24) hand-tuned for an even visual spread. */
export const WHEEL_ORDER: number[] = [
  2, 3, 5, 2, 10, 2, 3, 2, 5, 2, 3, 20, 2, 3, 5, 2, 10, 2, 3, 2, 5, 2, 3, 3,
];

export const WHEEL_SIZE = WHEEL_ORDER.length;
export const WHEEL_SLICE = 360 / WHEEL_SIZE;

const TIER_BY_MULT = new Map(WHEEL_TIERS.map((t) => [t.mult, t]));

export function tierFor(mult: number): WheelTier {
  return TIER_BY_MULT.get(mult) ?? WHEEL_TIERS[0];
}

export function colorFor(mult: number): string {
  return tierFor(mult).color;
}

/** Win probability for landing a given multiplier tier. */
export function chanceFor(mult: number): number {
  return (tierFor(mult).count / WHEEL_SIZE) * 100;
}

/** Pick a landing segment uniformly across the wheel. */
export function spinIndex(): number {
  return Math.floor(Math.random() * WHEEL_SIZE);
}
