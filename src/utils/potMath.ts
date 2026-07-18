import { GAME_REWARDS, type GameKind } from '../types';

/** Seed a payout from the selected minute stake. */
export function seedPot(game: GameKind, wager?: number): number {
  return Math.max(1, Math.round(wager ?? GAME_REWARDS[game]));
}

/** Mines ladder multipliers after each safe tile (1-indexed). */
export const MINES_LADDER = [1, 1.35, 1.75, 2.25, 2.9, 3.7, 4.7, 6];

export function minesPot(base: number, safeCount: number): number {
  const idx = Math.min(safeCount, MINES_LADDER.length - 1);
  return Math.round(base * MINES_LADDER[idx] * 10) / 10;
}

/** Hi-Lo pot grows with each correct call. */
export function hiloPot(base: number, streak: number): number {
  return Math.round(base * (1 + streak * 0.45) * 10) / 10;
}

/** Crash pot scales with live multiplier. */
export function crashPot(base: number, mult: number): number {
  return Math.round(base * mult * 10) / 10;
}

/** Color-spin double ladder: spin 0 = base, then up to x4. */
export function spinPot(base: number, doubles: number): number {
  return Math.round(base * Math.pow(2, doubles) * 10) / 10;
}

/** Dice risk: target 10–90; lower target = harder = bigger pot. */
export function dicePot(base: number, target: number): number {
  const risk = Math.max(0.1, Math.min(0.9, target / 100));
  const mult = 0.55 / risk;
  return Math.round(base * mult * 10) / 10;
}
