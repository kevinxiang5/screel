import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calendarDayKey,
  dayKeyFromPeriodId,
  periodId,
  periodStartMs,
  shiftDayKey,
  zonedParts,
} from './dayPeriod.ts';
import { lastNDays, unusedAllowance, weekOverWeekUsed } from './usageStats.ts';

describe('dayPeriod', () => {
  const tz = 'America/Los_Angeles';

  it('period starts today after reset clock', () => {
    const now = new Date('2026-08-06T17:00:00.000Z');
    const key = calendarDayKey(now, 4, 0, tz);
    assert.equal(key, '2026-08-06');
    assert.match(periodId(now, 4, 0, tz), /^2026-08-06T04:00@America\/Los_Angeles$/);
  });

  it('period starts yesterday before reset clock', () => {
    const now = new Date('2026-08-06T10:00:00.000Z');
    const parts = zonedParts(now, tz);
    assert.equal(parts.hour, 3);
    assert.equal(calendarDayKey(now, 4, 0, tz), '2026-08-05');
    const start = periodStartMs(now, 4, 0, tz);
    const startParts = zonedParts(new Date(start), tz);
    assert.equal(startParts.day, 5);
    assert.equal(startParts.hour, 4);
  });

  it('dayKeyFromPeriodId extracts YYYY-MM-DD', () => {
    assert.equal(dayKeyFromPeriodId('2026-08-06T04:00@America/Los_Angeles'), '2026-08-06');
    assert.equal(dayKeyFromPeriodId('bad'), null);
  });

  it('shiftDayKey walks calendar days', () => {
    assert.equal(shiftDayKey('2026-08-06', -1), '2026-08-05');
    assert.equal(shiftDayKey('2026-08-01', -1), '2026-07-31');
    assert.equal(shiftDayKey('2026-08-06', 1), '2026-08-07');
  });
});

describe('usageStats', () => {
  const opts = { resetHour: 4, resetMinute: 0, timeZone: 'America/Los_Angeles' };

  it('lastNDays merges live usage onto period today', () => {
    const today = calendarDayKey(new Date(), opts.resetHour, opts.resetMinute, opts.timeZone);
    const rows = lastNDays(
      [{ day: today, used: 10, bank: 240, puzzleEarned: 0, stakeNet: 0 }],
      3,
      opts,
      { used: 42, bank: 250, puzzleEarned: 4 },
    );
    assert.equal(rows.length, 3);
    assert.equal(rows[2].day, today);
    assert.equal(rows[2].used, 42);
    assert.equal(rows[2].bank, 250);
    assert.equal(rows[2].puzzleEarned, 4);
    assert.equal(rows[1].day, shiftDayKey(today, -1));
  });

  it('unusedAllowance excludes current period day', () => {
    const sum = unusedAllowance(
      [
        { day: '2026-08-01', used: 100, bank: 240, puzzleEarned: 0, stakeNet: 0 },
        { day: '2026-08-02', used: 40, bank: 240, puzzleEarned: 0, stakeNet: 0 },
        { day: '2026-08-03', used: 10, bank: 240, puzzleEarned: 0, stakeNet: 0 },
      ],
      '2026-08-03',
    );
    assert.equal(sum, 340);
  });

  it('weekOverWeekUsed returns pct when last week has usage', () => {
    const today = calendarDayKey(new Date(), opts.resetHour, opts.resetMinute, opts.timeZone);
    const log = Array.from({ length: 14 }, (_, i) => ({
      day: shiftDayKey(today, -(13 - i)),
      used: i < 7 ? 20 : 40,
      bank: 240,
      puzzleEarned: 0,
      stakeNet: 0,
    }));
    const wow = weekOverWeekUsed(log, opts);
    assert.equal(wow.lastWeek, 140);
    assert.equal(wow.thisWeek, 280);
    assert.equal(wow.pct, 100);
  });
});
