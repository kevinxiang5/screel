import { dropPlinko, type PlinkoRisk, PLINKO_MODES } from './plinko';

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
  /** Fair binomial outcome — payout uses this, not raw physics landing. */
  targetBin: number;
  /** Ideal x after each row (path[row+1] rights → peg gap). */
  pathXs: number[];
  lastPegKey: string | null;
  pegCooldown: number;
  settled: boolean;
  bin: number | null;
}

export const BALL_R = 6;
export const PEG_R = 3.5;

const GRAVITY = 0.26;
const RESTITUTION = 0.42;
const FRICTION = 0.94;
const MAX_SPEED = 7;
const SUBSTEPS = 3;
const PEG_COOLDOWN = 5;
/** How hard we steer toward the fair path (keeps gravity look, locks odds). */
const STEER = 0.085;

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

/** Peg column for a ball that has taken `rights` rights so far on this row. */
function pegIndexForPath(row: number, rights: number): number {
  return Math.max(0, Math.min(pegsInRow(row) - 1, rights + 1));
}

function pegX(layout: PlinkoLayout, row: number, index: number): number {
  const count = pegsInRow(row);
  const span = (count - 1) * layout.pegSpacing;
  const startX = (layout.width - span) / 2;
  return startX + index * layout.pegSpacing;
}

/**
 * Ideal center-line for each step of a fair path.
 * path[0]=0 … path[rows]=bin. After bounce at row r, rights = path[r+1].
 */
function pathGuideXs(layout: PlinkoLayout, path: number[]): number[] {
  const xs: number[] = [];
  // Start above center peg of row 0.
  xs.push(pegX(layout, 0, 1));
  for (let row = 0; row < layout.rows; row += 1) {
    const rights = path[row];
    xs.push(pegX(layout, row, pegIndexForPath(row, rights)));
  }
  xs.push(layout.binCenters[path[layout.rows]] ?? layout.width / 2);
  return xs;
}

export function spawnBall(layout: PlinkoLayout, stake: number, lockId: string): PlinkoBallState {
  const { bin, path } = dropPlinko(layout.rows);
  const pathXs = pathGuideXs(layout, path);
  const startX = pathXs[0] + (Math.random() - 0.5) * 2;

  return {
    id: `ball-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    lockId,
    stake,
    x: startX,
    y: Math.max(10, layout.topY - layout.rowSpacing * 0.65),
    vx: (Math.random() - 0.5) * 0.35,
    vy: 0.55 + Math.random() * 0.25,
    targetBin: bin,
    pathXs,
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

function collidePeg(ball: PlinkoBallState, peg: Peg, pegKey: string, pegSpacing: number): boolean {
  const dx = ball.x - peg.x;
  const dy = ball.y - peg.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const minDist = BALL_R + PEG_R;
  if (dist >= minDist) return false;

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

  // Small replace-style kick scaled to spacing — does NOT accumulate fat tails.
  const side = Math.random() < 0.5 ? -1 : 1;
  const kick = (0.35 + Math.random() * 0.35) * (pegSpacing / 28);
  ball.vx = side * kick + nx * 0.08;
  ball.vy = Math.max(ball.vy, 0.5 + Math.random() * 0.35);

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
    ball.vx = Math.abs(ball.vx) * RESTITUTION + 0.1;
  } else if (ball.x > right) {
    ball.x = right;
    ball.vx = -Math.abs(ball.vx) * RESTITUTION - 0.1;
  }
}

/** Progress 0..1 down the board → blend guide point along pathXs. */
function guideX(ball: PlinkoBallState, layout: PlinkoLayout): number {
  const startY = Math.max(8, layout.topY - layout.rowSpacing * 0.65);
  const endY = layout.binTop;
  const t = Math.max(0, Math.min(1, (ball.y - startY) / Math.max(1, endY - startY)));
  const slots = ball.pathXs.length - 1;
  const f = t * slots;
  const i = Math.min(slots - 1, Math.floor(f));
  const u = f - i;
  return ball.pathXs[i] + (ball.pathXs[i + 1] - ball.pathXs[i]) * u;
}

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

    // Steer toward the fair path so gravity looks real but odds stay binomial.
    const targetX = guideX(next, layout);
    const err = targetX - next.x;
    next.vx += err * STEER * dt;

    next.x += next.vx * dt;
    next.y += next.vy * dt;

    collideWalls(next, layout);

    for (const peg of layout.pegs) {
      if (Math.abs(peg.y - next.y) > layout.rowSpacing * 1.2 + BALL_R + PEG_R) continue;
      if (Math.abs(peg.x - next.x) > layout.pegSpacing * 1.2 + BALL_R + PEG_R) continue;
      collidePeg(next, peg, `${peg.row}:${peg.index}`, layout.pegSpacing);
    }

    // Near bins: lock into the predetermined fair slot.
    if (next.y >= layout.binTop - 14) {
      const cx = layout.binCenters[next.targetBin];
      const left = cx - layout.binWidth / 2 + BALL_R;
      const right = cx + layout.binWidth / 2 - BALL_R;
      if (next.x < left) {
        next.x = left;
        next.vx = Math.abs(next.vx) * 0.2;
      } else if (next.x > right) {
        next.x = right;
        next.vx = -Math.abs(next.vx) * 0.2;
      }
      next.vx += (cx - next.x) * 0.12;
    }

    if (next.y >= layout.binTop + layout.binHeight * 0.25) {
      next.bin = next.targetBin;
      next.settled = true;
      next.x = layout.binCenters[next.targetBin];
      next.y = layout.binTop + layout.binHeight * 0.45;
      next.vx = 0;
      next.vy = 0;
      break;
    }
  }

  if (!next.settled && next.y > layout.height + 40) {
    next.bin = next.targetBin;
    next.settled = true;
    next.x = layout.binCenters[next.targetBin];
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
