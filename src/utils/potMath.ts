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

/** Hi-Lo: each correct call ~50% (ignoring edges). Net after `streak` corrects. */
export function hiloPot(stake: number, streak: number): number {
  if (streak <= 0) return 0;
  return fairNet(stake, Math.pow(0.5, streak));
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

/** Slots pair/triple net payout (~slightly under even money). */
export function slotsPot(stake: number): number {
  return fairNet(stake, 0.42);
}

/** Wheel / color-style: stake * (mult - 1) when you hit your tier. */
export function wheelPot(stake: number, mult: number): number {
  return Math.max(0, Math.round(stake * Math.max(0, mult - 1) * 10) / 10);
}

/** Plinko: net from a display multiplier (1.0 = break-even). */
export function plinkoNet(stake: number, mult: number): number {
  return Math.round(stake * (mult - 1) * 10) / 10;
}
