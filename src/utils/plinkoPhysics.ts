import { dropPlinko, type PlinkoRisk, PLINKO_MODES } from './plinko';

export {
  dropPlinko,
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

export interface PlinkoBallState {
  id: string;
  lockId: string;
  stake: number;
  x: number;
  y: number;
  targetBin: number;
  waypoints: { x: number; y: number }[];
  segment: number;
  t: number;
  settled: boolean;
  bin: number | null;
}

const SEGMENT_SPEED = 0.14;

export function pegPosition(
  width: number,
  height: number,
  rows: number,
  row: number,
  col: number,
): { x: number; y: number } {
  const count = row + 1;
  const top = height * 0.07;
  const usableH = height * 0.7;
  const y = top + (usableH * row) / Math.max(rows - 1, 1);
  const gap = width / (count + 1);
  const x = gap * (col + 1);
  return { x, y };
}

export function layoutPegs(width: number, height: number, rows: number): Peg[] {
  const pegs: Peg[] = [];
  for (let row = 0; row < rows; row += 1) {
    const count = row + 1;
    for (let i = 0; i < count; i += 1) {
      const { x, y } = pegPosition(width, height, rows, row, i);
      pegs.push({ x, y, row, index: i });
    }
  }
  return pegs;
}

function buildWaypoints(
  width: number,
  height: number,
  rows: number,
  path: number[],
  binCount: number,
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [{ x: width / 2, y: 8 }];
  for (let row = 0; row < rows; row += 1) {
    const col = row === 0 ? 0 : path[row];
    points.push(pegPosition(width, height, rows, row, col));
  }
  const bin = path[rows];
  const binW = width / binCount;
  points.push({ x: binW * (bin + 0.5), y: height - 26 });
  return points;
}

export function spawnBall(
  width: number,
  height: number,
  rows: number,
  binCount: number,
  stake: number,
  lockId: string,
): PlinkoBallState {
  const { bin, path } = dropPlinko(rows);
  const waypoints = buildWaypoints(width, height, rows, path, binCount);
  const start = waypoints[0];
  return {
    id: `ball-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    lockId,
    stake,
    x: start.x,
    y: start.y,
    targetBin: bin,
    waypoints,
    segment: 0,
    t: 0,
    settled: false,
    bin: null,
  };
}

export function stepBall(ball: PlinkoBallState): PlinkoBallState {
  if (ball.settled) return ball;

  let { segment, t } = ball;
  t += SEGMENT_SPEED;
  if (t >= 1) {
    segment += 1;
    t = 0;
  }

  if (segment >= ball.waypoints.length - 1) {
    const last = ball.waypoints[ball.waypoints.length - 1];
    return {
      ...ball,
      segment: ball.waypoints.length - 1,
      t: 1,
      x: last.x,
      y: last.y,
      settled: true,
      bin: ball.targetBin,
    };
  }

  const a = ball.waypoints[segment];
  const b = ball.waypoints[segment + 1];
  return {
    ...ball,
    segment,
    t,
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

export function binReturn(stake: number, mult: number): number {
  return Math.max(0, Math.round(stake * mult));
}

export function multsForRisk(risk: PlinkoRisk): readonly number[] {
  return PLINKO_MODES[risk].mults;
}
