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
  /** Center X for each bin (length = rows + 1). */
  binCenters: number[];
  binWidth: number;
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
  /** Progress units per frame — slower on taller boards. */
  speed: number;
  settled: boolean;
  bin: number | null;
}

/** Stake-style: row 0 has 3 pegs, each lower row adds one. */
export function pegsInRow(row: number): number {
  return row + 3;
}

/**
 * Build a centered triangular peg board with uniform spacing.
 * Bottom row has `rows + 2` pegs → `rows + 1` gaps that align 1:1 with bins.
 */
export function buildLayout(width: number, height: number, rows: number): PlinkoLayout {
  const bins = rows + 1;
  const sidePad = Math.max(10, width * 0.04);
  const binHeight = Math.max(28, Math.min(40, height * 0.09));
  const binTop = height - binHeight - 6;
  const topY = Math.max(18, height * 0.06);
  const pegFloor = binTop - 14;
  const rowSpacing = rows > 1 ? (pegFloor - topY) / (rows - 1) : 0;
  const pegSpacing = (width - sidePad * 2) / (bins);
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

export function layoutPegs(width: number, height: number, rows: number): Peg[] {
  return buildLayout(width, height, rows).pegs;
}

function pegAt(layout: PlinkoLayout, row: number, index: number): Peg {
  const count = pegsInRow(row);
  const span = (count - 1) * layout.pegSpacing;
  const startX = (layout.width - span) / 2;
  return {
    x: startX + index * layout.pegSpacing,
    y: layout.topY + row * layout.rowSpacing,
    row,
    index,
  };
}

/**
 * Binomial path index → peg column.
 * Each row has a +1 left padding peg, so slot `pos` hits peg `pos + 1`.
 */
function bouncePeg(layout: PlinkoLayout, row: number, pos: number): Peg {
  const maxIndex = pegsInRow(row) - 1;
  const index = Math.max(0, Math.min(maxIndex, pos + 1));
  return pegAt(layout, row, index);
}

function buildWaypoints(layout: PlinkoLayout, path: number[]): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const startPeg = bouncePeg(layout, 0, 0);
  points.push({ x: startPeg.x, y: Math.max(8, layout.topY - layout.rowSpacing * 0.55) });

  for (let row = 0; row < layout.rows; row += 1) {
    const peg = bouncePeg(layout, row, path[row]);
    // Land slightly below the peg center so it reads as a bounce, not a pierce.
    points.push({ x: peg.x, y: peg.y + 1 });
  }

  const bin = path[layout.rows];
  const cx = layout.binCenters[bin] ?? layout.width / 2;
  // Drop from last peg into the bin with a short vertical finish.
  const last = points[points.length - 1];
  points.push({ x: last.x + (cx - last.x) * 0.35, y: layout.binTop - 4 });
  points.push({ x: cx, y: layout.binTop + layout.binHeight * 0.45 });
  return points;
}

export function spawnBall(layout: PlinkoLayout, stake: number, lockId: string): PlinkoBallState {
  const { bin, path } = dropPlinko(layout.rows);
  const waypoints = buildWaypoints(layout, path);
  const start = waypoints[0];
  // Keep drop duration similar across easy/medium/hard (~1.4–1.8s).
  const segments = Math.max(1, waypoints.length - 1);
  const targetFrames = 72 + layout.rows * 3;
  const speed = segments / targetFrames;

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
    speed,
    settled: false,
    bin: null,
  };
}

export function stepBall(ball: PlinkoBallState): PlinkoBallState {
  if (ball.settled) return ball;

  let { segment, t } = ball;
  t += ball.speed;
  while (t >= 1 && segment < ball.waypoints.length - 1) {
    t -= 1;
    segment += 1;
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

  // Ease in/out per segment so bounces feel less robotic.
  const eased = t * t * (3 - 2 * t);
  const a = ball.waypoints[segment];
  const b = ball.waypoints[segment + 1];
  return {
    ...ball,
    segment,
    t,
    x: a.x + (b.x - a.x) * eased,
    y: a.y + (b.y - a.y) * eased,
  };
}

export function binReturn(stake: number, mult: number): number {
  return Math.max(0, Math.round(stake * mult));
}

export function multsForRisk(risk: PlinkoRisk): readonly number[] {
  return PLINKO_MODES[risk].mults;
}
