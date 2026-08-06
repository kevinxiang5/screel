import type { UsageDayLog } from '../../types';
import {
  lastNDays,
  unusedAllowance,
  weekOverWeekUsed,
  withLive,
  type LiveUsage,
  type UsagePeriodOpts,
} from '../../utils/usageStats';
import { calendarDayKey, zonedParts } from '../../utils/dayPeriod';

/** `month` is 1–12. */
function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function padDay(n: number) {
  return String(n).padStart(2, '0');
}

/** Weekday of Y-M-D in the user's reset timezone (0 = Sunday). */
function weekdayInZone(year: number, month: number, day: number, timeZone: string) {
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(probe);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday] ?? 0;
}

export type { LiveUsage, UsagePeriodOpts };
export { lastNDays, unusedAllowance, weekOverWeekUsed };

export function UsageHeatmap({
  log,
  resetHour = 4,
  resetMinute = 0,
  timeZone = 'UTC',
  live,
}: {
  log: UsageDayLog[];
  resetHour?: number;
  resetMinute?: number;
  timeZone?: string;
  live?: LiveUsage;
}) {
  const opts = { resetHour, resetMinute, timeZone };
  const byDay = withLive(log, opts, live);
  const rows = [...byDay.values()];
  const now = new Date();
  const parts = zonedParts(now, timeZone);
  const year = parts.year;
  const month = parts.month;
  const maxUsed = Math.max(1, ...rows.map((row) => row.used || 0), 1);
  const count = daysInMonth(year, month);
  const label = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(now);
  const startWeekday = weekdayInZone(year, month, 1, timeZone);
  const periodToday = calendarDayKey(now, resetHour, resetMinute, timeZone);

  return (
    <div className="heatmap">
      <div className="heatmap-label">{label}</div>
      <div className="heatmap-weekdays" aria-hidden>
        {WEEKDAYS.map((d, i) => (
          <span key={`${d}-${i}`}>{d}</span>
        ))}
      </div>
      <div className="heatmap-grid">
        {Array.from({ length: startWeekday }, (_, i) => (
          <div key={`pad-${i}`} className="heatmap-cell empty" aria-hidden />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const day = i + 1;
          const key = `${year}-${padDay(month)}-${padDay(day)}`;
          const row = byDay.get(key);
          const intensity = row ? row.used / maxUsed : 0;
          const isToday = key === periodToday;
          return (
            <div
              key={key}
              className={`heatmap-cell dated ${isToday ? 'today' : ''} ${row ? 'has-data' : ''}`}
              title={row ? `${key}: ${row.used}m used` : `${key}: no data yet`}
              style={row ? { ['--heat' as string]: String(0.22 + intensity * 0.78) } : undefined}
            >
              <span className="heatmap-day">{day}</span>
            </div>
          );
        })}
      </div>
      <div className="meter-meta">
        <span>Days follow your reset clock</span>
        <span>Brighter = more usage</span>
      </div>
    </div>
  );
}

export function WeekBars({
  log,
  resetHour = 4,
  resetMinute = 0,
  timeZone = 'UTC',
  live,
}: {
  log: UsageDayLog[];
  resetHour?: number;
  resetMinute?: number;
  timeZone?: string;
  live?: LiveUsage;
}) {
  const days = lastNDays(log, 7, { resetHour, resetMinute, timeZone }, live);
  const max = Math.max(1, ...days.map((row) => row.used), 1);
  return (
    <div className="week-bars">
      {days.map((row) => (
        <div className="week-bar" key={row.day}>
          <div
            className="week-bar-fill"
            style={{ height: `${Math.max(row.used > 0 ? 8 : 2, (row.used / max) * 100)}%` }}
          />
          <span>{Number(row.day.slice(8))}</span>
        </div>
      ))}
    </div>
  );
}
