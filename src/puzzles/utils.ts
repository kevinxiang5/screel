export function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function keyOf(x: number, y: number) {
  return `${x},${y}`;
}

/** BFS reachability on an open grid with wall set. */
export function canReach(
  size: number,
  walls: Set<string>,
  start: [number, number],
  end: [number, number],
): boolean {
  const q: [number, number][] = [start];
  const seen = new Set([keyOf(...start)]);
  while (q.length) {
    const [x, y] = q.shift()!;
    if (x === end[0] && y === end[1]) return true;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const k = keyOf(nx, ny);
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      if (walls.has(k) || seen.has(k)) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return false;
}
