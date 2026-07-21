import { type PlinkoRisk, PLINKO_MODES } from './plinko';

export {
  formatPlinkoMult,
  plinkoChance,
  plinkoExpectedMult,
  PLINKO_MODES,
  type PlinkoRisk,
} from './plinko';

export interface Peg {
  x: number;
  y: number;
  row: number;
  index: number;
}

export interface PlinkoLayout {
  width: number;
  height: number;
  rows: number;
  bins: number;
  pegSpacing: number;
  rowSpacing: number;
  topY: number;
  binTop: number;
  binHeight: number;
  sidePad: number;
  pegs: Peg[];
  binCenters: number[];
  binWidth: number;
}

export interface PlinkoBallState {
  id: string;
  lockId: string;
  stake: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Peg index last collided with — avoids sticky double-hits. */
  lastPegKey: string | null;
  pegCooldown: number;
  settled: boolean;
  bin: number | null;
}

/** Visual radius in CSS is 12px → 6. */
export const BALL_R = 6;
export const PEG_R = 3.5;

const GRAVITY = 0.28;
const RESTITUTION = 0.52;
const FRICTION = 0.985;
const MAX_SPEED = 9;
const SUBSTEPS = 3;
/** Frames before the same peg can be hit again. */
const PEG_COOLDOWN = 4;

/** Stake-style: row 0 has 3 pegs, each lower row adds one. */
export function pegsInRow(row: number): number {
  return row + 3;
}

/**
 * Centered triangular peg board with uniform spacing.
 * Bottom row has `rows + 2` pegs → `rows + 1` gaps aligned with bins.
 */
export function buildLayout(width: number, height: number, rows: number): PlinkoLayout {
  const bins = rows + 1;
  const sidePad = Math.max(10, width * 0.04);
  const binHeight = Math.max(28, Math.min(40, height * 0.09));
  const binTop = height - binHeight - 6;
  const topY = Math.max(22, height * 0.07);
  const pegFloor = binTop - 16;
  const rowSpacing = rows > 1 ? (pegFloor - topY) / (rows - 1) : 0;
  const pegSpacing = (width - sidePad * 2) / bins;
  const pegs: Peg[] = [];

  for (let row = 0; row < rows; row += 1) {
    const count = pegsInRow(row);
    const span = (count - 1) * pegSpacing;
    const startX = (width - span) / 2;
    const y = topY + row * rowSpacing;
    for (let index = 0; index < count; index += 1) {
      pegs.push({ x: startX + index * pegSpacing, y, row, index });
    }
  }

  const binWidth = pegSpacing;
  const binCenters = Array.from({ length: bins }, (_, i) => sidePad + pegSpacing * (i + 0.5));

  return {
    width,
    height,
    rows,
    bins,
    pegSpacing,
    rowSpacing,
    topY,
    binTop,
    binHeight,
    sidePad,
    pegs,
    binCenters,
    binWidth,
  };
}

export function spawnBall(layout: PlinkoLayout, stake: number, lockId: string): PlinkoBallState {
  const startPeg = layout.pegs.find((p) => p.row === 0 && p.index === 1);
  const x = (startPeg?.x ?? layout.width / 2) + (Math.random() - 0.5) * 4;
  return {
    id: `ball-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    lockId,
    stake,
    x,
    y: Math.max(10, layout.topY - layout.rowSpacing * 0.65),
    vx: (Math.random() - 0.5) * 1.1,
    vy: 0.6 + Math.random() * 0.4,
    lastPegKey: null,
    pegCooldown: 0,
    settled: false,
    bin: null,
  };
}

function clampSpeed(ball: PlinkoBallState) {
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > MAX_SPEED) {
    const s = MAX_SPEED / speed;
    ball.vx *= s;
    ball.vy *= s;
  }
}

function collidePeg(ball: PlinkoBallState, peg: Peg, pegKey: string): boolean {
  const dx = ball.x - peg.x;
  const dy = ball.y - peg.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const minDist = BALL_R + PEG_R;
  if (dist >= minDist) return false;

  // Still overlapping the same peg during cooldown — just separate, don't re-kick.
  const samePeg = ball.lastPegKey === pegKey && ball.pegCooldown > 0;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist + 0.35;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  if (samePeg) return true;

  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= (1 + RESTITUTION) * vn * nx;
    ball.vy -= (1 + RESTITUTION) * vn * ny;
  }

  // Random left/right kick — this is what makes Plinko feel alive.
  const side = Math.random() < 0.5 ? -1 : 1;
  const kick = 0.85 + Math.random() * 1.15;
  ball.vx += side * kick + nx * 0.25;
  // Keep the ball moving downward so it can't hover on a peg.
  ball.vy = Math.max(ball.vy, 0.55 + Math.random() * 0.65);

  ball.lastPegKey = pegKey;
  ball.pegCooldown = PEG_COOLDOWN;
  clampSpeed(ball);
  return true;
}

function collideWalls(ball: PlinkoBallState, layout: PlinkoLayout) {
  const left = layout.sidePad + BALL_R * 0.5;
  const right = layout.width - layout.sidePad - BALL_R * 0.5;
  if (ball.x < left) {
    ball.x = left;
    ball.vx = Math.abs(ball.vx) * RESTITUTION + 0.15;
  } else if (ball.x > right) {
    ball.x = right;
    ball.vx = -Math.abs(ball.vx) * RESTITUTION - 0.15;
  }
}

function nearestBin(layout: PlinkoLayout, x: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < layout.binCenters.length; i += 1) {
    const d = Math.abs(layout.binCenters[i] - x);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/**
 * Advance one ball with gravity + peg collisions.
 * Uses substeps so fast falls don't tunnel through pegs.
 */
export function stepBall(ball: PlinkoBallState, layout: PlinkoLayout): PlinkoBallState {
  if (ball.settled) return ball;

  const next: PlinkoBallState = {
    ...ball,
    pegCooldown: Math.max(0, ball.pegCooldown - 1),
  };

  const dt = 1 / SUBSTEPS;
  for (let step = 0; step < SUBSTEPS; step += 1) {
    next.vy += GRAVITY * dt;
    next.vx *= Math.pow(FRICTION, dt);
    next.x += next.vx * dt;
    next.y += next.vy * dt;

    collideWalls(next, layout);

    for (const peg of layout.pegs) {
      // Broad-phase: skip distant pegs.
      if (Math.abs(peg.y - next.y) > layout.rowSpacing * 1.2 + BALL_R + PEG_R) continue;
      if (Math.abs(peg.x - next.x) > layout.pegSpacing * 1.2 + BALL_R + PEG_R) continue;
      collidePeg(next, peg, `${peg.row}:${peg.index}`);
    }

    // Soft bin walls near the bottom so the ball settles into a slot.
    if (next.y >= layout.binTop - 10) {
      const bin = nearestBin(layout, next.x);
      const left = layout.binCenters[bin] - layout.binWidth / 2 + BALL_R;
      const right = layout.binCenters[bin] + layout.binWidth / 2 - BALL_R;
      if (next.x < left) {
        next.x = left;
        next.vx = Math.abs(next.vx) * 0.25;
      } else if (next.x > right) {
        next.x = right;
        next.vx = -Math.abs(next.vx) * 0.25;
      }
    }

    if (next.y >= layout.binTop + layout.binHeight * 0.25) {
      const bin = nearestBin(layout, next.x);
      next.bin = bin;
      next.settled = true;
      next.x = layout.binCenters[bin];
      next.y = layout.binTop + layout.binHeight * 0.45;
      next.vx = 0;
      next.vy = 0;
      break;
    }
  }

  // Safety: if somehow stuck above the board forever, force settle.
  if (!next.settled && next.y > layout.height + 40) {
    const bin = nearestBin(layout, next.x);
    next.bin = bin;
    next.settled = true;
    next.x = layout.binCenters[bin];
    next.y = layout.binTop + layout.binHeight * 0.45;
    next.vx = 0;
    next.vy = 0;
  }

  clampSpeed(next);
  return next;
}

export function binReturn(stake: number, mult: number): number {
  return Math.max(0, Math.round(stake * mult));
}

export function multsForRisk(risk: PlinkoRisk): readonly number[] {
  return PLINKO_MODES[risk].mults;
}
