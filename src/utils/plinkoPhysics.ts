import { PLINKO_MULTS, PLINKO_ROWS } from './plinko';

export { PLINKO_MULTS, PLINKO_ROWS, plinkoChance, dropPlinko, plinkoExpectedMult } from './plinko';

export interface Peg {
  x: number;
  y: number;
  row: number;
  index: number;
}

export interface PlinkoBallState {
  id: string;
  lockId: string;
  stake: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  trail: { x: number; y: number }[];
  bin: number | null;
  settled: boolean;
}

const BALL_R = 7;
const PEG_R = 4;
const GRAVITY = 0.18;
const RESTITUTION = 0.62;
const FRICTION = 0.992;

export function layoutPegs(width: number, height: number): Peg[] {
  const pegs: Peg[] = [];
  const top = height * 0.08;
  const usableH = height * 0.68;
  for (let row = 0; row < PLINKO_ROWS; row += 1) {
    const count = row + 1;
    const y = top + (usableH * row) / (PLINKO_ROWS - 1 || 1);
    for (let i = 0; i < count; i += 1) {
      const gap = width / (count + 1);
      pegs.push({ x: gap * (i + 1), y, row, index: i });
    }
  }
  return pegs;
}

export function spawnBall(
  width: number,
  stake: number,
  lockId: string,
): PlinkoBallState {
  const jitter = (Math.random() - 0.5) * width * 0.08;
  return {
    id: `ball-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    lockId,
    stake,
    x: width / 2 + jitter,
    y: 14,
    vx: (Math.random() - 0.5) * 1.4,
    vy: 0.4,
    trail: [],
    bin: null,
    settled: false,
  };
}

function collidePeg(ball: PlinkoBallState, peg: Peg) {
  const dx = ball.x - peg.x;
  const dy = ball.y - peg.y;
  const dist = Math.hypot(dx, dy) || 0.0001;
  const minDist = BALL_R + PEG_R;
  if (dist >= minDist) return;
  const nx = dx / dist;
  const ny = dy / dist;
  // Separate
  const overlap = minDist - dist;
  ball.x += nx * overlap;
  ball.y += ny * overlap;
  // Reflect velocity
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx = (ball.vx - 2 * vn * nx) * RESTITUTION;
    ball.vy = (ball.vy - 2 * vn * ny) * RESTITUTION;
    // Peg kick + slight randomness so paths diverge
    ball.vx += nx * (0.35 + Math.random() * 0.55) + (Math.random() - 0.5) * 0.4;
    ball.vy += Math.abs(ny) * 0.15;
  }
}

export function stepBall(
  ball: PlinkoBallState,
  pegs: Peg[],
  width: number,
  height: number,
): PlinkoBallState {
  if (ball.settled) return ball;

  const next = { ...ball, trail: ball.trail.slice(-10) };
  next.vy += GRAVITY;
  next.vx *= FRICTION;
  next.x += next.vx;
  next.y += next.vy;

  // Walls
  if (next.x < BALL_R) {
    next.x = BALL_R;
    next.vx = Math.abs(next.vx) * RESTITUTION;
  } else if (next.x > width - BALL_R) {
    next.x = width - BALL_R;
    next.vx = -Math.abs(next.vx) * RESTITUTION;
  }

  for (const peg of pegs) collidePeg(next, peg);

  next.trail = [...next.trail, { x: next.x, y: next.y }];

  const binLine = height * 0.82;
  if (next.y >= binLine) {
    const binW = width / PLINKO_MULTS.length;
    const bin = Math.max(0, Math.min(PLINKO_MULTS.length - 1, Math.floor(next.x / binW)));
    next.bin = bin;
    next.settled = true;
    next.y = height - 22;
    next.x = binW * (bin + 0.5);
    next.vx = 0;
    next.vy = 0;
  }

  return next;
}

export function binReturn(stake: number, bin: number): number {
  const mult = PLINKO_MULTS[bin] ?? 0;
  return Math.max(0, Math.round(stake * mult));
}
