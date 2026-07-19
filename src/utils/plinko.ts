/** 8-row Plinko — 9 bins. Multipliers tuned so E[m] ≈ 0.88 (~12% house edge). */
export const PLINKO_ROWS = 8;

export const PLINKO_MULTS = [5, 2, 1.2, 0.75, 0.45, 0.75, 1.2, 2, 5] as const;

function binom(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i += 1) r = (r * (n - k + i)) / i;
  return r;
}

const TOTAL = 2 ** PLINKO_ROWS;

export function plinkoChance(bin: number): number {
  return (binom(PLINKO_ROWS, bin) / TOTAL) * 100;
}

/** Simulate a drop: each row, ball goes left or right with equal chance. */
export function dropPlinko(): { bin: number; path: number[] } {
  const path: number[] = [0];
  let pos = 0;
  for (let row = 0; row < PLINKO_ROWS; row += 1) {
    pos += Math.random() < 0.5 ? 0 : 1;
    path.push(pos);
  }
  return { bin: pos, path };
}

export function plinkoExpectedMult(): number {
  let sum = 0;
  for (let k = 0; k < PLINKO_MULTS.length; k += 1) {
    sum += (binom(PLINKO_ROWS, k) / TOTAL) * PLINKO_MULTS[k];
  }
  return sum;
}
