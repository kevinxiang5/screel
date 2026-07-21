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
  /** Right deflections so far — maps to landing bin (classic Plinko). */
  rights: number;
  /** Highest peg row that already triggered a bounce. */
  lastRowHit: number;
  settled: boolean;
  bin: number | null;
}

export const BALL_R = 6;
export const PEG_R = 3.5;

const GRAVITY = 0.38;
const AIR_DRAG = 0.992;
const RESTITUTION = 0.35;
const MAX_SPEED = 9;
const SUBSTEPS = 4;
const MIN_FALL = 1.15;

export function pegsInRow(row: number): number {
  return row + 3;
}

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
  return {
    id: `ball-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    lockId,
    stake,
    x: layout.width / 2 + (Math.random() - 0.5) * layout.pegSpacing * 0.15,
    y: Math.max(8, layout.topY - layout.rowSpacing * 0.55),
    vx: (Math.random() - 0.5) * 0.25,
    vy: 0.35,
    rights: 0,
    lastRowHit: -1,
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

function pushOut(ball: PlinkoBallState, nx: number, ny: number, minDist: number, dist: number) {
  const overlap = minDist - dist + 0.6;
  ball.x += nx * overlap;
  ball.y += ny * overlap;
}

function binFromRights(layout: PlinkoLayout, rights: number): number {
  return Math.max(0, Math.min(layout.bins - 1, rights));
}

function binFromX(layout: PlinkoLayout, x: number): number {
  const rel = x - layout.sidePad;
  const idx = Math.round(rel / layout.pegSpacing - 0.5);
  return Math.max(0, Math.min(layout.bins - 1, idx));
}

/** One peg bounce per row — 50/50 left/right like standard Plinko boards. */
function bouncePeg(ball: PlinkoBallState, peg: Peg, layout: PlinkoLayout): boolean {
  const dx = ball.x - peg.x;
  const dy = ball.y - peg.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const minDist = BALL_R + PEG_R;
  if (dist >= minDist) return false;

  const nx = dx / dist;
  const ny = dy / dist;
  pushOut(ball, nx, ny, minDist, dist);

  // Already bounced this row — only separate, no second impulse (prevents pin-stick).
  if (peg.row <= ball.lastRowHit) return true;

  // Only register a row bounce while falling onto the peg from above.
  if (ball.vy < 0.15) return true;

  ball.lastRowHit = peg.row;
  const goRight = Math.random() < 0.5;
  if (goRight) ball.rights += 1;

  const kickScale = layout.pegSpacing / 30;
  ball.vx = (goRight ? 1 : -1) * (1.1 + Math.random() * 0.65) * kickScale;
  ball.vy = MIN_FALL + Math.random() * 0.55;

  // Tiny outward normal so the ball clears the peg immediately.
  ball.x += nx * 0.4;
  ball.y += Math.abs(ny) * 0.25;

  clampSpeed(ball);
  return true;
}

function collideWalls(ball: PlinkoBallState, layout: PlinkoLayout) {
  const left = layout.sidePad + BALL_R;
  const right = layout.width - layout.sidePad - BALL_R;
  if (ball.x < left) {
    ball.x = left;
    ball.vx = Math.abs(ball.vx) * RESTITUTION;
  } else if (ball.x > right) {
    ball.x = right;
    ball.vx = -Math.abs(ball.vx) * RESTITUTION;
  }
}

function settleBall(ball: PlinkoBallState, layout: PlinkoLayout): PlinkoBallState {
  const bin =
    ball.lastRowHit >= layout.rows - 1 ? binFromRights(layout, ball.rights) : binFromX(layout, ball.x);
  return {
    ...ball,
    bin,
    settled: true,
    x: layout.binCenters[bin],
    y: layout.binTop + layout.binHeight * 0.42,
    vx: 0,
    vy: 0,
  };
}

export function stepBall(ball: PlinkoBallState, layout: PlinkoLayout): PlinkoBallState {
  if (ball.settled) return ball;

  const next: PlinkoBallState = { ...ball };

  const dt = 1 / SUBSTEPS;
  for (let step = 0; step < SUBSTEPS; step += 1) {
    next.vy += GRAVITY * dt;
    next.vx *= AIR_DRAG;
    next.vy *= Math.pow(AIR_DRAG, dt);

    next.x += next.vx * dt;
    next.y += next.vy * dt;

    collideWalls(next, layout);

    // Closest peg first — avoids fighting multiple overlaps in one substep.
    let hitPeg: Peg | null = null;
    let hitDist = Infinity;
    for (const peg of layout.pegs) {
      if (Math.abs(peg.y - next.y) > layout.rowSpacing + BALL_R + PEG_R + 2) continue;
      if (Math.abs(peg.x - next.x) > layout.pegSpacing + BALL_R + PEG_R + 2) continue;
      const d = Math.hypot(next.x - peg.x, next.y - peg.y);
      if (d < BALL_R + PEG_R && d < hitDist) {
        hitDist = d;
        hitPeg = peg;
      }
    }
    if (hitPeg) bouncePeg(next, hitPeg, layout);

    if (next.y >= layout.binTop + layout.binHeight * 0.2) {
      return settleBall(next, layout);
    }
  }

  if (next.y > layout.height + 48) {
    return settleBall(next, layout);
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
