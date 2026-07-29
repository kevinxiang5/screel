import type { UsageDayLog } from '../../types';

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function padDay(n: number) {
  return String(n).padStart(2, '0');
}

/** Build the last N calendar days (including empty slots) for charts. */
export function lastNDays(log: UsageDayLog[], n: number): UsageDayLog[] {
  const rows = Array.isArray(log) ? log : [];
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const out: UsageDayLog[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${padDay(d.getMonth() + 1)}-${padDay(d.getDate())}`;
    out.push(
      byDay.get(key) ?? {
        day: key,
        used: 0,
        bank: 0,
        puzzleEarned: 0,
        stakeNet: 0,
      },
    );
  }
  return out;
}

export function UsageHeatmap({ log }: { log: UsageDayLog[] }) {
  const rows = Array.isArray(log) ? log : [];
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const maxUsed = Math.max(1, ...rows.map((row) => row.used || 0), 1);
  const count = daysInMonth(year, month);
  const label = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const startWeekday = new Date(year, month, 1).getDay();
  const todayKey = `${year}-${padDay(month + 1)}-${padDay(now.getDate())}`;

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
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`heatmap-cell dated ${isToday ? 'today' : ''} ${row ? 'has-data' : ''}`}
              title={row ? `${key}: ${row.used}m used` : `${key}: no data yet`}
              style={
                row
                  ? { ['--heat' as string]: String(0.22 + intensity * 0.78) }
                  : undefined
              }
            >
              <span className="heatmap-day">{day}</span>
            </div>
          );
        })}
      </div>
      <div className="meter-meta">
        <span>Number = date</span>
        <span>Brighter = more usage</span>
      </div>
    </div>
  );
}

export function WeekBars({ log }: { log: UsageDayLog[] }) {
  const days = lastNDays(log, 7);
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

export function unusedAllowance(log: UsageDayLog[]): number {
  if (!Array.isArray(log)) return 0;
  return log.reduce((sum, row) => sum + Math.max(0, (row.bank ?? 0) - (row.used ?? 0)), 0);
}

export function weekOverWeekUsed(log: UsageDayLog[]): {
  thisWeek: number;
  lastWeek: number;
  pct: number | null;
} {
  const thisWeek = lastNDays(log, 7);
  const twoWeeks = lastNDays(log, 14);
  const lastWeek = twoWeeks.slice(0, 7);
  const a = thisWeek.reduce((s, r) => s + r.used, 0);
  const b = lastWeek.reduce((s, r) => s + r.used, 0);
  if (b === 0) return { thisWeek: a, lastWeek: b, pct: null };
  return { thisWeek: a, lastWeek: b, pct: Math.round(((a - b) / b) * 100) };
}
