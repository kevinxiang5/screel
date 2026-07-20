import { chanceFor } from './wheel';
import { GAME_REWARDS, type GameKind } from '../types';

/**
 * Target house edge across challenge payouts (~12%).
 * Pot values are always net minutes added on a win.
 * A miss subtracts the stake via settleRound — stake is never escrowed up front.
 */
export const HOUSE_EDGE = 0.12;

/** Seed a payout base from the selected minute stake. */
export function seedPot(game: GameKind, wager?: number): number {
  return Math.max(1, Math.round(wager ?? GAME_REWARDS[game]));
}

/** Net profit for a given win chance (0–1), with house edge. */
export function fairNet(stake: number, winChance: number, edge = HOUSE_EDGE): number {
  const p = Math.max(0.02, Math.min(0.98, winChance));
  return Math.max(0, Math.round(stake * ((1 - edge) / p - 1) * 10) / 10);
}

/**
 * Mines: survival-fair ladder with house edge.
 * After `safeCount` safe reveals on a 25-tile board with `hazards` bombs.
 */
export function minesSurviveChance(hazards: number, safeCount: number, tiles = 25): number {
  if (safeCount <= 0) return 1;
  const safeTiles = tiles - hazards;
  if (safeCount > safeTiles) return 0;
  let p = 1;
  for (let i = 0; i < safeCount; i += 1) {
    p *= (safeTiles - i) / (tiles - i);
  }
  return p;
}

export function minesPot(stake: number, safeCount: number, hazards = 5): number {
  if (safeCount <= 0) return 0;
  return fairNet(stake, minesSurviveChance(hazards, safeCount));
}

/** Rank values for Hi-Lo deck modes. */
export function hiloRankValues(tight: boolean): number[] {
  const min = tight ? 5 : 2;
  const spread = tight ? 7 : 13;
  return Array.from({ length: spread }, (_, i) => min + i);
}

/** Win chance for one Hi-Lo call given the current card and direction. */
export function hiloWinChance(
  card: number,
  direction: 'higher' | 'lower',
  tight: boolean,
): number {
  const values = hiloRankValues(tight);
  const others = values.filter((v) => v !== card);
  if (others.length === 0) return 0.5;
  const wins = others.filter((v) => (direction === 'higher' ? v > card : v < card)).length;
  return wins / others.length;
}

/** Hi-Lo net payout after a streak of correct calls (pass cumulative win probability). */
export function hiloPot(stake: number, cumulativeWinChance: number): number {
  if (cumulativeWinChance <= 0) return 0;
  return fairNet(stake, cumulativeWinChance);
}

/**
 * Crash: display multiplier `mult` means total-return style.
 * Net profit = stake * (mult - 1). Crash curve carries the house edge.
 */
export function crashPot(stake: number, mult: number): number {
  return Math.max(0, Math.round(stake * Math.max(0, mult - 1) * 10) / 10);
}

/** House-edged crash point: ~12% instant bust, else (1-e)/(1-u). */
export function rollCrashPoint(edge = HOUSE_EDGE): number {
  const u = Math.random();
  if (u < edge) return 1;
  const crash = (1 - edge) / (1 - u);
  return Math.max(1.01, Math.min(100, Math.round(crash * 100) / 100));
}

/** Dice: `chance` is win probability percent (10–90). */
export function dicePot(stake: number, chancePercent: number): number {
  return fairNet(stake, chancePercent / 100);
}

/** Match-three symbol weights (must match SlotsGame). */
export const SLOTS_WEIGHTS = [22, 20, 18, 16, 14, 10] as const;

/** Chance any pair or triple on three reels. */
export function slotsPairChance(weights: readonly number[] = SLOTS_WEIGHTS): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  const n = weights.length;
  let hit = 0;
  for (let a = 0; a < n; a += 1) {
    for (let b = 0; b < n; b += 1) {
      for (let c = 0; c < n; c += 1) {
        const p = (weights[a] * weights[b] * weights[c]) / total ** 3;
        if (new Set([a, b, c]).size <= 2) hit += p;
      }
    }
  }
  return hit;
}

/** Slots first-spin net payout. */
export function slotsPot(stake: number, pairChance = slotsPairChance()): number {
  return fairNet(stake, pairChance);
}

/** Slots double-up net payout after two winning spins. */
export function slotsDoublePot(stake: number, pairChance = slotsPairChance()): number {
  return fairNet(stake, pairChance * pairChance);
}

/** Multiplier wheel: payout matches displayed hit chance for the picked tier. */
export function wheelPot(stake: number, mult: number): number {
  return fairNet(stake, chanceFor(mult) / 100);
}

/** Plinko: net from a total-return multiplier (1.0 = break-even). */
export function plinkoNet(stake: number, mult: number): number {
  return Math.round(stake * (mult - 1) * 10) / 10;
}
