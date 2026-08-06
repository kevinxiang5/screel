import type { UsageDayLog } from '../types';
import { calendarDayKey, shiftDayKey } from './dayPeriod';

export type UsagePeriodOpts = {
  resetHour: number;
  resetMinute: number;
  timeZone: string;
};

export type LiveUsage = {
  used: number;
  bank: number;
  puzzleEarned: number;
  stakeNet?: number;
};

function padDay(n: number) {
  return String(n).padStart(2, '0');
}

function emptyRow(day: string): UsageDayLog {
  return { day, used: 0, bank: 0, puzzleEarned: 0, stakeNet: 0 };
}

/** Merge live period numbers into the archive map under the period day key. */
export function withLive(
  log: UsageDayLog[],
  opts: UsagePeriodOpts,
  live?: LiveUsage,
): Map<string, UsageDayLog> {
  const byDay = new Map((Array.isArray(log) ? log : []).map((row) => [row.day, row]));
  if (!live) return byDay;
  const todayKey = calendarDayKey(new Date(), opts.resetHour, opts.resetMinute, opts.timeZone);
  const existing = byDay.get(todayKey);
  byDay.set(todayKey, {
    day: todayKey,
    used: Math.max(0, Math.round(live.used)),
    bank: Math.max(0, Math.round(live.bank)),
    puzzleEarned: Math.max(0, Math.round(live.puzzleEarned)),
    stakeNet: live.stakeNet ?? existing?.stakeNet ?? 0,
  });
  return byDay;
}

/** Last N allowance periods (aligned to reset clock), including today. */
export function lastNDays(
  log: UsageDayLog[],
  n: number,
  opts?: UsagePeriodOpts,
  live?: LiveUsage,
): UsageDayLog[] {
  const out: UsageDayLog[] = [];
  if (!opts) {
    const byDay = new Map((Array.isArray(log) ? log : []).map((row) => [row.day, row]));
    const now = new Date();
    for (let i = n - 1; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = `${d.getFullYear()}-${padDay(d.getMonth() + 1)}-${padDay(d.getDate())}`;
      out.push(byDay.get(key) ?? emptyRow(key));
    }
    return out;
  }

  const byDay = withLive(log, opts, live);
  const todayKey = calendarDayKey(new Date(), opts.resetHour, opts.resetMinute, opts.timeZone);
  for (let i = n - 1; i >= 0; i -= 1) {
    const key = shiftDayKey(todayKey, -i);
    out.push(byDay.get(key) ?? emptyRow(key));
  }
  return out;
}

/** Sum unused minutes from closed archive days (excludes the current period day). */
export function unusedAllowance(log: UsageDayLog[], excludeDay?: string): number {
  if (!Array.isArray(log)) return 0;
  return log.reduce((sum, row) => {
    if (excludeDay && row.day === excludeDay) return sum;
    return sum + Math.max(0, (row.bank ?? 0) - (row.used ?? 0));
  }, 0);
}

export function weekOverWeekUsed(
  log: UsageDayLog[],
  opts?: UsagePeriodOpts,
  live?: LiveUsage,
): {
  thisWeek: number;
  lastWeek: number;
  pct: number | null;
} {
  const thisWeek = lastNDays(log, 7, opts, live);
  const twoWeeks = lastNDays(log, 14, opts, live);
  const lastWeek = twoWeeks.slice(0, 7);
  const a = thisWeek.reduce((s, r) => s + r.used, 0);
  const b = lastWeek.reduce((s, r) => s + r.used, 0);
  if (b === 0) return { thisWeek: a, lastWeek: b, pct: null };
  return { thisWeek: a, lastWeek: b, pct: Math.round(((a - b) / b) * 100) };
}
