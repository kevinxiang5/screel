/** Allowance day periods that roll at a local reset clock time (timezone-aware). */

export function detectTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Local wall-clock parts in a given IANA timezone. */
export function zonedParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** UTC ms for Y-M-D h:m:s as wall time in `timeZone`. */
export function zonedDateToUtcMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): number {
  let guess = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i++) {
    const p = zonedParts(new Date(guess), timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const want = Date.UTC(year, month - 1, day, hour, minute, second);
    guess += want - asUtc;
  }
  return guess;
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  delta: number,
): { year: number; month: number; day: number } {
  const dt = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

/** Start of the current allowance period (last reset moment). */
export function periodStartMs(
  now: Date,
  resetHour: number,
  resetMinute: number,
  timeZone: string,
): number {
  const p = zonedParts(now, timeZone);
  const minsNow = p.hour * 60 + p.minute;
  const resetMins = resetHour * 60 + resetMinute;
  const startDay =
    minsNow >= resetMins
      ? { year: p.year, month: p.month, day: p.day }
      : addCalendarDays(p.year, p.month, p.day, -1);
  return zonedDateToUtcMs(
    startDay.year,
    startDay.month,
    startDay.day,
    resetHour,
    resetMinute,
    0,
    timeZone,
  );
}

/** Stable id for the current period (used for auto-reset). */
export function periodId(
  now: Date,
  resetHour: number,
  resetMinute: number,
  timeZone: string,
): string {
  const start = periodStartMs(now, resetHour, resetMinute, timeZone);
  const p = zonedParts(new Date(start), timeZone);
  const hh = String(resetHour).padStart(2, '0');
  const mm = String(resetMinute).padStart(2, '0');
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}T${hh}:${mm}@${timeZone}`;
}

export function formatMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

export function formatResetClock(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export const ALLOWANCE_MIN = 30;
export const ALLOWANCE_MAX = 960; // 16 hours
export const ALLOWANCE_PRESETS = [60, 120, 180, 240, 360, 480, 720, 960] as const;
