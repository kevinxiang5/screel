import type { UsageDayLog } from '../../types';
import {
  lastNDays,
  unusedAllowance,
  weekOverWeekUsed,
  withLive,
  type LiveUsage,
  type UsagePeriodOpts,
} from '../../utils/usageStats';
import { calendarDayKey } from '../../utils/dayPeriod';

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function padDay(n: number) {
  return String(n).padStart(2, '0');
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
  const year = now.getFullYear();
  const month = now.getMonth();
  const maxUsed = Math.max(1, ...rows.map((row) => row.used || 0), 1);
  const count = daysInMonth(year, month);
  const label = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const startWeekday = new Date(year, month, 1).getDay();
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
          const key = `${year}-${padDay(month + 1)}-${padDay(day)}`;
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
