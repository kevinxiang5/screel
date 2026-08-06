import { Capacitor } from '@capacitor/core';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ScreelScreenTime } from '../native/ScreelScreenTime';
import {
  MAX_ROUND_WIN,
  MAX_STAKE,
  PUZZLE_COOLDOWN_MS,
  PUZZLE_DAILY_CAP,
  STAKE_DAILY_NET_CAP,
  bankCeiling,
  type DailyChallenge,
  type FontTheme,
  type GameKind,
  type HistoryEntry,
  type PuzzleId,
  type RoundResult,
  type ScreelState,
  type TabId,
  type UsageDayLog,
  type UsageSource,
} from '../types';
import {
  ALLOWANCE_MAX,
  ALLOWANCE_MIN,
  calendarDayKey,
  dayKeyFromPeriodId,
  detectTimeZone,
  periodId,
} from '../utils/dayPeriod';
import { hashBankPin, isValidPin, pinsMatch } from '../utils/bankPin';
import { ensureFontTheme } from '../utils/fonts';

const STORAGE_KEY = 'screel-v3';

const defaultChallenges = (): DailyChallenge[] => [
  {
    id: 'clear-3',
    title: 'Three Puzzles',
    description: 'Clear 3 skill puzzles today',
    progress: 0,
    target: 3,
    reward: 8,
    claimed: false,
  },
  {
    id: 'play-3',
    title: 'Three Challenges',
    description: 'Play 3 optional stake challenges',
    progress: 0,
    target: 3,
    reward: 8,
    claimed: false,
  },
  {
    id: 'win-1',
    title: 'First Win',
    description: 'Win and bank a challenge payout',
    progress: 0,
    target: 1,
    reward: 10,
    claimed: false,
  },
];

function clampAllowance(n: number): number {
  return Math.max(ALLOWANCE_MIN, Math.min(ALLOWANCE_MAX, Math.round(n)));
}

function clampWager(n: number): number {
  return Math.max(1, Math.min(MAX_STAKE, Math.round(n)));
}

function todayStakeNet(s: ScreelState): number {
  const day = calendarDayKey(new Date(), s.resetHour, s.resetMinute, s.timeZone);
  return s.usageDayLog.find((row) => row.day === day)?.stakeNet ?? 0;
}

/** Room left for a Play win after bank ceiling, daily stake net cap, and per-round max. */
function stakeWinRoom(s: ScreelState): number {
  const ceiling = bankCeiling(s.baseLimit, ALLOWANCE_MAX);
  const bankRoom = Math.max(0, ceiling - s.minutesBank);
  const stakeRoom = Math.max(0, STAKE_DAILY_NET_CAP - Math.max(0, todayStakeNet(s)));
  return Math.min(bankRoom, stakeRoom, MAX_ROUND_WIN);
}

function bankRoom(s: ScreelState): number {
  return Math.max(0, bankCeiling(s.baseLimit, ALLOWANCE_MAX) - s.minutesBank);
}

function upsertUsageLog(log: UsageDayLog[], entry: UsageDayLog): UsageDayLog[] {
  const next = [...log];
  const idx = next.findIndex((row) => row.day === entry.day);
  if (idx >= 0) next[idx] = { ...next[idx], ...entry };
  else next.push(entry);
  next.sort((a, b) => a.day.localeCompare(b.day));
  return next.slice(-90);
}

function snapshotDay(s: ScreelState, stakeNetExtra = 0, dayOverride?: string): UsageDayLog {
  const day =
    dayOverride ??
    calendarDayKey(new Date(), s.resetHour, s.resetMinute, s.timeZone || detectTimeZone());
  const existing = s.usageDayLog.find((row) => row.day === day);
  return {
    day,
    used: Math.max(0, Math.round(s.minutesUsed)),
    bank: Math.max(0, Math.round(s.minutesBank)),
    puzzleEarned: Math.max(0, Math.round(s.puzzleEarnedToday)),
    stakeNet: (existing?.stakeNet ?? 0) + stakeNetExtra,
  };
}

const defaultState = (): ScreelState => {
  const timeZone = detectTimeZone();
  const resetHour = 4;
  const resetMinute = 0;
  const minutesBank = 240;
  const day = calendarDayKey(new Date(), resetHour, resetMinute, timeZone);
  return {
    schemaVersion: 4,
    displayName: 'Focus Mode',
    connected: false,
    usageSource: 'none',
    ageVerified: false,
    ageBlocked: false,
    setupComplete: false,
    guideComplete: false,
    guideTipTab: null,
    focusGoal: null,
    distractions: [],
    fontTheme: 'felt',
    baseLimit: 240,
    minutesBank,
    minutesUsed: 0,
    resetHour,
    resetMinute,
    timeZone,
    activePeriodId: periodId(new Date(), resetHour, resetMinute, timeZone),
    streak: 0,
    winStreak: 0,
    xp: 0,
    level: 1,
    totalWon: 0,
    totalLost: 0,
    biggestWin: 0,
    gamesPlayed: 0,
    history: [],
    challenges: defaultChallenges(),
    soundOn: true,
    riskAlerts: true,
    minutesEarnedToday: 0,
    puzzleEarnedToday: 0,
    lastPuzzleAt: 0,
    usageDayLog: [
      {
        day,
        used: 0,
        bank: minutesBank,
        puzzleEarned: 0,
        stakeNet: 0,
      },
    ],
    wagerMinutes: 5,
    bankPinHash: null,
  };
};

function migrateHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 40).map((h) => {
    const row = h as Partial<HistoryEntry> & {
      reward?: number;
      wager?: number;
      payout?: number;
    };
    let delta = 0;
    if (typeof row.delta === 'number') delta = row.delta;
    else if (typeof row.reward === 'number') delta = row.reward;
    else delta = (row.payout ?? 0) - (row.wager ?? 0);
    return {
      id: String(row.id ?? `${Date.now()}`),
      game: (row.game as GameKind) || 'blackjack',
      delta,
      result: (row.result as RoundResult) || 'lose',
      detail: String(row.detail ?? ''),
      at: typeof row.at === 'number' ? row.at : Date.now(),
    };
  });
}

function migrateUsageLog(raw: unknown): UsageDayLog[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((row): row is UsageDayLog => {
      const r = row as Partial<UsageDayLog>;
      return typeof r.day === 'string' && typeof r.used === 'number';
    })
    .map((row) => ({
      day: row.day,
      used: Math.max(0, Math.round(row.used)),
      bank: Math.max(0, Math.round(row.bank ?? 0)),
      puzzleEarned: Math.max(0, Math.round(row.puzzleEarned ?? 0)),
      stakeNet: Math.round(row.stakeNet ?? 0),
    }))
    .slice(-90);
}

function loadState(): ScreelState {
  const base = defaultState();
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem('screel-v2') ??
      localStorage.getItem('screel-v1');
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<ScreelState> & {
      challenges?: DailyChallenge[];
    };
    const timeZone = parsed.timeZone || detectTimeZone();
    const resetHour = typeof parsed.resetHour === 'number' ? parsed.resetHour : 4;
    const resetMinute = typeof parsed.resetMinute === 'number' ? parsed.resetMinute : 0;
    const baseLimit = clampAllowance(parsed.baseLimit ?? 240);
    const ceiling = bankCeiling(baseLimit, ALLOWANCE_MAX);
    const legacyChallenges = parsed.challenges?.some(
      (c) =>
        c.id === 'risk-15' ||
        c.id === 'earn-15' ||
        /wager|felt|high roller/i.test(`${c.title} ${c.description}`),
    );
    const hasClear3 = parsed.challenges?.some((c) => c.id === 'clear-3');
    return {
      ...base,
      ...parsed,
      schemaVersion: 4,
      baseLimit,
      minutesBank:
        typeof parsed.minutesBank === 'number'
          ? Math.max(0, Math.min(ceiling, parsed.minutesBank))
          : baseLimit,
      minutesUsed: typeof parsed.minutesUsed === 'number' ? Math.max(0, parsed.minutesUsed) : 0,
      resetHour: Math.max(0, Math.min(23, resetHour)),
      resetMinute: Math.max(0, Math.min(59, resetMinute)),
      timeZone,
      activePeriodId:
        parsed.activePeriodId || periodId(new Date(), resetHour, resetMinute, timeZone),
      usageSource: parsed.usageSource ?? (parsed.connected ? 'simulated' : 'none'),
      ageBlocked: Boolean(parsed.ageBlocked),
      setupComplete:
        typeof parsed.setupComplete === 'boolean'
          ? parsed.setupComplete
          : Boolean(parsed.ageVerified && parsed.connected),
      // Legacy installs already past setup skip the chooser.
      guideComplete:
        typeof (parsed as { guideComplete?: boolean }).guideComplete === 'boolean'
          ? Boolean((parsed as { guideComplete?: boolean }).guideComplete)
          : typeof parsed.setupComplete === 'boolean'
            ? parsed.setupComplete
            : false,
      guideTipTab: null,
      focusGoal: typeof parsed.focusGoal === 'string' ? parsed.focusGoal : null,
      distractions: Array.isArray(parsed.distractions)
        ? parsed.distractions.filter((d): d is string => typeof d === 'string')
        : [],
      fontTheme: (parsed.fontTheme as FontTheme) || 'felt',
      challenges:
        parsed.challenges?.length && !legacyChallenges && hasClear3
          ? parsed.challenges
          : defaultChallenges(),
      minutesEarnedToday:
        typeof parsed.minutesEarnedToday === 'number' ? Math.max(0, parsed.minutesEarnedToday) : 0,
      puzzleEarnedToday:
        typeof parsed.puzzleEarnedToday === 'number' ? Math.max(0, parsed.puzzleEarnedToday) : 0,
      lastPuzzleAt: typeof parsed.lastPuzzleAt === 'number' ? parsed.lastPuzzleAt : 0,
      usageDayLog: (() => {
        const log = migrateUsageLog(parsed.usageDayLog);
        const day = calendarDayKey(
          new Date(),
          Math.max(0, Math.min(23, resetHour)),
          Math.max(0, Math.min(59, resetMinute)),
          timeZone,
        );
        const used = typeof parsed.minutesUsed === 'number' ? Math.max(0, parsed.minutesUsed) : 0;
        const bank =
          typeof parsed.minutesBank === 'number' ? Math.max(0, parsed.minutesBank) : baseLimit;
        const puzzle =
          typeof parsed.puzzleEarnedToday === 'number' ? Math.max(0, parsed.puzzleEarnedToday) : 0;
        return upsertUsageLog(log, {
          day,
          used,
          bank,
          puzzleEarned: puzzle,
          stakeNet: log.find((r) => r.day === day)?.stakeNet ?? 0,
        });
      })(),
      wagerMinutes: clampWager(parsed.wagerMinutes ?? 5),
      winStreak: typeof parsed.winStreak === 'number' ? Math.max(0, parsed.winStreak) : 0,
      bankPinHash: typeof parsed.bankPinHash === 'string' ? parsed.bankPinHash : null,
      history: migrateHistory(parsed.history),
      totalLost: typeof parsed.totalLost === 'number' ? Math.max(0, parsed.totalLost) : 0,
    };
  } catch {
    return base;
  }
}

interface ScreelContextValue {
  state: ScreelState;
  remaining: number;
  puzzleRemaining: number;
  setBaseLimit: (n: number) => void;
  setResetTime: (hour: number, minute: number) => void;
  setWagerMinutes: (n: number) => void;
  connectScreenTime: (opts?: { source?: UsageSource; minutesUsed?: number }) => void;
  disconnectScreenTime: () => void;
  syncUsageMinutes: (minutes: number) => void;
  settleRound: (payload: {
    game: GameKind;
    pot: number;
    kept: boolean;
    wager?: number;
    detail: string;
    result?: RoundResult;
    roundId?: string;
  }) => number;
  lockStake: (amount: number, game: GameKind) => { id: string; amount: number } | null;
  resolveLock: (payload: {
    lockId: string;
    returnMinutes: number;
    detail: string;
    result?: RoundResult;
  }) => number;
  forfeitAllLocks: () => void;
  earnPuzzle: (payload: { puzzleId: PuzzleId; reward: number; detail: string }) => number;
  claimChallenge: (id: string) => void;
  bankLocked: boolean;
  bankUnlocked: boolean;
  unlockBank: (pin: string) => Promise<boolean>;
  lockBankSession: () => void;
  setBankPin: (pin: string) => Promise<boolean>;
  clearBankPin: (pin: string) => Promise<boolean>;
  updateProfile: (
    patch: Partial<
      Pick<
        ScreelState,
        | 'displayName'
        | 'soundOn'
        | 'riskAlerts'
        | 'ageVerified'
        | 'fontTheme'
        | 'setupComplete'
        | 'focusGoal'
        | 'distractions'
      >
    >,
  ) => void;
  resetDay: () => void;
  verifyAge: () => void;
  blockUnderage: () => void;
  completeSetup: () => void;
  completeGuide: (tab?: TabId) => void;
  dismissGuideTip: () => void;
  setFontTheme: (theme: FontTheme) => void;
}

const ScreelContext = createContext<ScreelContextValue | null>(null);

async function restartNativeMonitor(state: ScreelState, resetUsed: boolean) {
  if (!Capacitor.isNativePlatform() || state.usageSource !== 'screenTime' || !state.connected) return;
  await ScreelScreenTime.startMonitoring({
    // Use base allowance so stake/puzzle bank changes do not restart DeviceActivity.
    budgetMinutes: Math.max(1, state.baseLimit),
    resetUsed,
    resetHour: state.resetHour,
    resetMinute: state.resetMinute,
  });
}

export function ScreelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScreelState>(() => loadState());
  const stateRef = useRef(state);
  const [bankUnlocked, setBankUnlocked] = useState(false);
  const locksRef = useRef(new Map<string, { amount: number; game: GameKind }>());
  const settledRoundIdsRef = useRef(new Set<string>());
  /** False while native usage is being zeroed for a new period. */
  const nativePeriodReadyRef = useRef(true);

  useEffect(() => {
    stateRef.current = state;
    const id = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 400);
    return () => window.clearTimeout(id);
  }, [state]);

  useEffect(() => {
    ensureFontTheme(state.fontTheme);
  }, [state.fontTheme]);

  useEffect(() => {
    document.documentElement.dataset.font = state.fontTheme;
  }, [state.fontTheme]);

  useEffect(() => {
    const tick = () => {
      setState((s) => {
        const tz = s.timeZone || detectTimeZone();
        const nextId = periodId(new Date(), s.resetHour, s.resetMinute, tz);
        if (nextId === s.activePeriodId) {
          const snap = snapshotDay(s);
          const usageDayLog = upsertUsageLog(s.usageDayLog, snap);
          const sameLog =
            usageDayLog.length === s.usageDayLog.length &&
            usageDayLog.every((row, i) => {
              const prev = s.usageDayLog[i];
              return (
                prev &&
                prev.day === row.day &&
                prev.used === row.used &&
                prev.bank === row.bank &&
                prev.puzzleEarned === row.puzzleEarned &&
                prev.stakeNet === row.stakeNet
              );
            });
          if (sameLog && s.timeZone === tz) return s;
          return { ...s, timeZone: tz, usageDayLog };
        }
        // Archive under the OLD period day key (not the new day's key).
        const oldDay =
          dayKeyFromPeriodId(s.activePeriodId) ??
          calendarDayKey(new Date(Date.now() - 60_000), s.resetHour, s.resetMinute, tz);
        const archived = upsertUsageLog(s.usageDayLog, snapshotDay(s, 0, oldDay));
        return {
          ...s,
          timeZone: tz,
          activePeriodId: nextId,
          minutesBank: s.baseLimit,
          minutesUsed: 0,
          challenges: defaultChallenges(),
          streak: s.streak + 1,
          minutesEarnedToday: 0,
          puzzleEarnedToday: 0,
          usageDayLog: archived,
        };
      });
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || state.usageSource !== 'screenTime' || !state.connected) {
      nativePeriodReadyRef.current = true;
      return;
    }
    if (state.minutesUsed !== 0) {
      nativePeriodReadyRef.current = true;
      return;
    }
    nativePeriodReadyRef.current = false;
    let cancelled = false;
    void (async () => {
      try {
        await ScreelScreenTime.resetUsageDay();
        await restartNativeMonitor(state, true);
        await ScreelScreenTime.applyShieldWhenBroke({ broke: false });
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) nativePeriodReadyRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activePeriodId]);

  useEffect(() => {
    setBankUnlocked(false);
  }, [state.activePeriodId]);

  const remaining = Math.max(0, state.minutesBank - state.minutesUsed);
  const puzzleRemaining = Math.max(0, PUZZLE_DAILY_CAP - state.puzzleEarnedToday);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || state.usageSource !== 'screenTime' || !state.connected) return;

    let cancelled = false;

    const sync = async () => {
      try {
        if (!nativePeriodReadyRef.current) return;
        const usage = await ScreelScreenTime.getTodayUsageMinutes();
        if (cancelled || !nativePeriodReadyRef.current) return;
        let bank = 0;
        let used = Math.max(0, Math.round(usage.minutes));
        setState((s) => {
          const tz = s.timeZone || detectTimeZone();
          const currentId = periodId(new Date(), s.resetHour, s.resetMinute, tz);
          // Let the period tick own the rollover; don't write stale/new native counts across the boundary.
          if (currentId !== s.activePeriodId) return s;

          bank = s.minutesBank;
          used = Math.max(0, Math.round(usage.minutes));
          if (s.minutesUsed === used) {
            const snap = snapshotDay(s);
            const existing = s.usageDayLog.find((row) => row.day === snap.day);
            if (
              existing &&
              existing.used === snap.used &&
              existing.bank === snap.bank &&
              existing.puzzleEarned === snap.puzzleEarned &&
              existing.stakeNet === snap.stakeNet
            ) {
              return s;
            }
            return { ...s, usageDayLog: upsertUsageLog(s.usageDayLog, snap) };
          }
          const withUsed = { ...s, minutesUsed: used };
          return {
            ...withUsed,
            usageDayLog: upsertUsageLog(withUsed.usageDayLog, snapshotDay(withUsed)),
          };
        });
        await ScreelScreenTime.applyShieldWhenBroke({ broke: bank - used <= 0 });
      } catch {
        /* ignore */
      }
    };

    void sync();
    const id = window.setInterval(() => void sync(), 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [state.connected, state.usageSource, state.activePeriodId]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || state.usageSource !== 'screenTime' || !state.connected) return;
    void restartNativeMonitor(state, false).catch(() => undefined);
    // Restart only when allowance/reset/link changes — not on every stake/puzzle bank tweak.
  }, [state.baseLimit, state.resetHour, state.resetMinute, state.connected, state.usageSource]);

  const value = useMemo<ScreelContextValue>(() => {
    return {
      state,
      remaining,
      puzzleRemaining,
      setBaseLimit: (n) => {
        setState((s) => {
          const next = clampAllowance(n);
          const delta = next - s.baseLimit;
          const bank = Math.max(0, Math.min(bankCeiling(next, ALLOWANCE_MAX), s.minutesBank + delta));
          const withBank = { ...s, baseLimit: next, minutesBank: bank };
          return {
            ...withBank,
            usageDayLog: upsertUsageLog(withBank.usageDayLog, snapshotDay(withBank)),
          };
        });
      },
      setResetTime: (hour, minute) => {
        setState((s) => {
          const resetHour = Math.max(0, Math.min(23, Math.round(hour)));
          const resetMinute = Math.max(0, Math.min(59, Math.round(minute)));
          const timeZone = detectTimeZone();
          const nextId = periodId(new Date(), resetHour, resetMinute, timeZone);
          if (nextId === s.activePeriodId) {
            return { ...s, resetHour, resetMinute, timeZone };
          }
          const oldDay =
            dayKeyFromPeriodId(s.activePeriodId) ??
            calendarDayKey(new Date(), s.resetHour, s.resetMinute, s.timeZone || timeZone);
          const newDay = calendarDayKey(new Date(), resetHour, resetMinute, timeZone);
          const archived = upsertUsageLog(s.usageDayLog, snapshotDay(s, 0, oldDay));
          // Same calendar period day: keep bank/used, only retarget the reset clock.
          if (oldDay === newDay) {
            return {
              ...s,
              resetHour,
              resetMinute,
              timeZone,
              activePeriodId: nextId,
              usageDayLog: archived,
            };
          }
          // Crossed into a different period day: start a fresh allowance day.
          return {
            ...s,
            resetHour,
            resetMinute,
            timeZone,
            activePeriodId: nextId,
            minutesBank: s.baseLimit,
            minutesUsed: 0,
            minutesEarnedToday: 0,
            puzzleEarnedToday: 0,
            challenges: defaultChallenges(),
            usageDayLog: archived,
          };
        });
      },
      setWagerMinutes: (n) => setState((s) => ({ ...s, wagerMinutes: clampWager(n) })),
      connectScreenTime: (opts) => {
        const source = opts?.source ?? 'simulated';
        setState((s) => {
          const timeZone = detectTimeZone();
          const used =
            typeof opts?.minutesUsed === 'number' ? Math.max(0, Math.round(opts.minutesUsed)) : 0;
          return {
            ...s,
            connected: true,
            usageSource: source,
            minutesUsed: used,
            timeZone,
            activePeriodId: periodId(new Date(), s.resetHour, s.resetMinute, timeZone),
          };
        });
      },
      disconnectScreenTime: () =>
        setState((s) => ({ ...s, connected: false, usageSource: 'none' })),
      syncUsageMinutes: (minutes) =>
        setState((s) => {
          const next = { ...s, minutesUsed: Math.max(0, Math.round(minutes)) };
          return { ...next, usageDayLog: upsertUsageLog(next.usageDayLog, snapshotDay(next)) };
        }),
      settleRound: ({ game, pot, kept, wager = 0, detail, result, roundId }) => {
        if (roundId) {
          if (settledRoundIdsRef.current.has(roundId)) return 0;
          settledRoundIdsRef.current.add(roundId);
          if (settledRoundIdsRef.current.size > 240) {
            const first = settledRoundIdsRef.current.values().next().value;
            if (first) settledRoundIdsRef.current.delete(first);
          }
        }
        const s = stateRef.current;
        const isPush = result === 'push';
        const available = Math.max(0, s.minutesBank - s.minutesUsed);
        let applied = isPush
          ? 0
          : kept
            ? Math.max(0, Math.round(pot))
            : -Math.min(Math.max(0, Math.round(wager)), available);
        if (kept && applied > 0) {
          applied = Math.min(applied, stakeWinRoom(s));
        }
        const entry: HistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          game,
          delta: applied,
          result: result ?? (kept ? 'win' : 'lose'),
          detail,
          at: Date.now(),
        };
        const challenges = s.challenges.map((c) => {
          if (c.claimed) return c;
          if (c.id === 'play-3') return { ...c, progress: Math.min(c.target, c.progress + 1) };
          if (c.id === 'win-1' && kept) return { ...c, progress: Math.min(c.target, c.progress + 1) };
          return c;
        });
        const xpGain = kept ? (result === 'blackjack' ? 35 : 22) : 4;
        const bankAfter = Math.max(0, s.minutesBank + applied);
        const next: ScreelState = {
          ...s,
          minutesBank: bankAfter,
          minutesEarnedToday: s.minutesEarnedToday + Math.max(0, applied),
          totalWon: s.totalWon + Math.max(0, applied),
          totalLost: s.totalLost + Math.max(0, -applied),
          biggestWin: Math.max(s.biggestWin, Math.max(0, applied)),
          gamesPlayed: s.gamesPlayed + 1,
          winStreak: kept ? s.winStreak + 1 : isPush ? s.winStreak : 0,
          xp: s.xp + xpGain,
          level: Math.max(1, Math.floor((s.xp + xpGain) / 100) + 1),
          history: [entry, ...s.history].slice(0, 80),
          challenges,
          usageDayLog: upsertUsageLog(
            s.usageDayLog,
            snapshotDay({ ...s, minutesBank: bankAfter }, applied),
          ),
        };
        stateRef.current = next;
        setState(next);
        if (applied !== 0 && next.usageSource === 'screenTime' && next.connected) {
          void ScreelScreenTime.applyShieldWhenBroke({
            broke: next.minutesBank - next.minutesUsed <= 0,
          });
        }
        return applied;
      },
      lockStake: (amount, game) => {
        const s = stateRef.current;
        const available = Math.max(0, s.minutesBank - s.minutesUsed);
        const stake = Math.min(Math.max(0, Math.round(amount)), available, MAX_STAKE);
        if (stake < 1) return null;
        const id = `lock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        locksRef.current.set(id, { amount: stake, game });
        const next = { ...s, minutesBank: s.minutesBank - stake };
        stateRef.current = next;
        setState(next);
        if (next.usageSource === 'screenTime' && next.connected) {
          void ScreelScreenTime.applyShieldWhenBroke({
            broke: next.minutesBank - next.minutesUsed <= 0,
          });
        }
        return { id, amount: stake };
      },
      resolveLock: ({ lockId, returnMinutes, detail, result }) => {
        const lock = locksRef.current.get(lockId);
        if (!lock) return 0;
        locksRef.current.delete(lockId);
        const s = stateRef.current;
        let credited = Math.max(0, Math.round(returnMinutes));
        let net = credited - lock.amount;
        if (net > 0) {
          const clipped = Math.min(net, stakeWinRoom(s));
          net = clipped;
          credited = lock.amount + clipped;
        }
        const entry: HistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          game: lock.game,
          delta: net,
          result: result ?? (net > 0 ? 'win' : net < 0 ? 'lose' : 'push'),
          detail,
          at: Date.now(),
        };
        const challenges = s.challenges.map((c) => {
          if (c.claimed) return c;
          if (c.id === 'play-3') return { ...c, progress: Math.min(c.target, c.progress + 1) };
          if (c.id === 'win-1' && net > 0) return { ...c, progress: Math.min(c.target, c.progress + 1) };
          return c;
        });
        const xpGain = net > 0 ? 22 : 4;
        const bankAfter = s.minutesBank + credited;
        const next: ScreelState = {
          ...s,
          minutesBank: bankAfter,
          minutesEarnedToday: s.minutesEarnedToday + Math.max(0, net),
          totalWon: s.totalWon + Math.max(0, net),
          totalLost: s.totalLost + Math.max(0, -net),
          biggestWin: Math.max(s.biggestWin, Math.max(0, net)),
          gamesPlayed: s.gamesPlayed + 1,
          winStreak: net > 0 ? s.winStreak + 1 : net === 0 ? s.winStreak : 0,
          xp: s.xp + xpGain,
          level: Math.max(1, Math.floor((s.xp + xpGain) / 100) + 1),
          history: [entry, ...s.history].slice(0, 80),
          challenges,
          usageDayLog: upsertUsageLog(
            s.usageDayLog,
            snapshotDay({ ...s, minutesBank: bankAfter }, net),
          ),
        };
        stateRef.current = next;
        setState(next);
        if (next.usageSource === 'screenTime' && next.connected) {
          void ScreelScreenTime.applyShieldWhenBroke({
            broke: next.minutesBank - next.minutesUsed <= 0,
          });
        }
        return net;
      },
      forfeitAllLocks: () => {
        const ids = [...locksRef.current.keys()];
        for (const lockId of ids) {
          const lock = locksRef.current.get(lockId);
          if (!lock) continue;
          locksRef.current.delete(lockId);
          const s = stateRef.current;
          const entry: HistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            game: lock.game,
            delta: -lock.amount,
            result: 'lose',
            detail: 'Left while stake was in play',
            at: Date.now(),
          };
          const next: ScreelState = {
            ...s,
            totalLost: s.totalLost + lock.amount,
            gamesPlayed: s.gamesPlayed + 1,
            winStreak: 0,
            history: [entry, ...s.history].slice(0, 80),
            usageDayLog: upsertUsageLog(s.usageDayLog, snapshotDay(s, -lock.amount)),
          };
          stateRef.current = next;
          setState(next);
        }
      },
      earnPuzzle: ({ puzzleId, reward, detail }) => {
        const s = stateRef.current;
        const now = Date.now();
        if (now - s.lastPuzzleAt < PUZZLE_COOLDOWN_MS) return 0;
        const room = Math.max(0, PUZZLE_DAILY_CAP - s.puzzleEarnedToday);
        const credited = Math.min(room, bankRoom(s), Math.max(0, Math.round(reward)));
        if (credited < 1) return 0;
        const entry: HistoryEntry = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          game: 'puzzle',
          delta: credited,
          result: 'win',
          detail: detail || `Puzzle ${puzzleId}`,
          at: now,
        };
        const challenges = s.challenges.map((c) => {
          if (c.claimed) return c;
          if (c.id === 'clear-3') return { ...c, progress: Math.min(c.target, c.progress + 1) };
          return c;
        });
        const bankAfter = s.minutesBank + credited;
        const puzzleAfter = s.puzzleEarnedToday + credited;
        const next: ScreelState = {
          ...s,
          minutesBank: bankAfter,
          minutesEarnedToday: s.minutesEarnedToday + credited,
          puzzleEarnedToday: puzzleAfter,
          lastPuzzleAt: now,
          totalWon: s.totalWon + credited,
          biggestWin: Math.max(s.biggestWin, credited),
          xp: s.xp + 12,
          level: Math.max(1, Math.floor((s.xp + 12) / 100) + 1),
          history: [entry, ...s.history].slice(0, 80),
          challenges,
          usageDayLog: upsertUsageLog(
            s.usageDayLog,
            snapshotDay({ ...s, minutesBank: bankAfter, puzzleEarnedToday: puzzleAfter }),
          ),
        };
        stateRef.current = next;
        setState(next);
        if (next.usageSource === 'screenTime' && next.connected) {
          void ScreelScreenTime.applyShieldWhenBroke({
            broke: next.minutesBank - next.minutesUsed <= 0,
          });
        }
        return credited;
      },
      claimChallenge: (id) => {
        setState((s) => {
          const challenge = s.challenges.find((c) => c.id === id);
          if (!challenge || challenge.claimed || challenge.progress < challenge.target) return s;
          const applied = Math.min(challenge.reward, bankRoom(s));
          if (applied < 1) return s;
          const bankAfter = s.minutesBank + applied;
          const next: ScreelState = {
            ...s,
            minutesBank: bankAfter,
            minutesEarnedToday: s.minutesEarnedToday + applied,
            totalWon: s.totalWon + applied,
            biggestWin: Math.max(s.biggestWin, applied),
            challenges: s.challenges.map((c) => (c.id === id ? { ...c, claimed: true } : c)),
            xp: s.xp + 20,
            level: Math.max(1, Math.floor((s.xp + 20) / 100) + 1),
            usageDayLog: upsertUsageLog(
              s.usageDayLog,
              snapshotDay({ ...s, minutesBank: bankAfter }),
            ),
          };
          if (next.usageSource === 'screenTime' && next.connected) {
            void ScreelScreenTime.applyShieldWhenBroke({
              broke: next.minutesUsed >= next.minutesBank,
            });
          }
          return next;
        });
      },
      bankLocked: Boolean(state.bankPinHash),
      bankUnlocked: !state.bankPinHash || bankUnlocked,
      unlockBank: async (pin) => {
        if (!state.bankPinHash) {
          setBankUnlocked(true);
          return true;
        }
        const ok = await pinsMatch(pin, state.bankPinHash);
        if (ok) setBankUnlocked(true);
        return ok;
      },
      lockBankSession: () => setBankUnlocked(false),
      setBankPin: async (pin) => {
        if (!isValidPin(pin)) return false;
        const hash = await hashBankPin(pin);
        setState((s) => ({ ...s, bankPinHash: hash }));
        setBankUnlocked(true);
        return true;
      },
      clearBankPin: async (pin) => {
        if (!state.bankPinHash) {
          setBankUnlocked(true);
          return true;
        }
        const ok = await pinsMatch(pin, state.bankPinHash);
        if (!ok) return false;
        setState((s) => ({ ...s, bankPinHash: null }));
        setBankUnlocked(true);
        return true;
      },
      updateProfile: (patch) => setState((s) => ({ ...s, ...patch })),
      verifyAge: () => setState((s) => ({ ...s, ageVerified: true, ageBlocked: false })),
      blockUnderage: () =>
        setState((s) => ({
          ...s,
          ageVerified: false,
          ageBlocked: true,
          setupComplete: false,
          guideComplete: false,
          guideTipTab: null,
          connected: false,
          usageSource: 'none',
        })),
      completeSetup: () => setState((s) => ({ ...s, setupComplete: true, guideComplete: false })),
      completeGuide: (_tab) =>
        setState((s) => ({
          ...s,
          guideComplete: true,
          guideTipTab: null,
        })),
      dismissGuideTip: () => setState((s) => ({ ...s, guideTipTab: null })),
      setFontTheme: (theme) => {
        ensureFontTheme(theme);
        setState((s) => ({ ...s, fontTheme: theme }));
      },
      resetDay: () => {
        setState((s) => {
          const timeZone = detectTimeZone();
          const day =
            dayKeyFromPeriodId(s.activePeriodId) ??
            calendarDayKey(new Date(), s.resetHour, s.resetMinute, timeZone);
          const archived = upsertUsageLog(s.usageDayLog, snapshotDay(s, 0, day));
          return {
            ...s,
            minutesBank: s.baseLimit,
            minutesUsed: 0,
            challenges: defaultChallenges(),
            streak: s.streak + 1,
            timeZone,
            activePeriodId: periodId(new Date(), s.resetHour, s.resetMinute, timeZone),
            minutesEarnedToday: 0,
            puzzleEarnedToday: 0,
            usageDayLog: archived,
          };
        });
        void (async () => {
          try {
            if (!Capacitor.isNativePlatform()) return;
            const s = stateRef.current;
            if (s.usageSource !== 'screenTime' || !s.connected) return;
            await ScreelScreenTime.resetUsageDay();
            await restartNativeMonitor(s, true);
            await ScreelScreenTime.applyShieldWhenBroke({ broke: false });
          } catch {
            /* ignore */
          }
        })();
      },
    };
  }, [state, remaining, puzzleRemaining, bankUnlocked]);

  return <ScreelContext.Provider value={value}>{children}</ScreelContext.Provider>;
}

export function useScreel() {
  const ctx = useContext(ScreelContext);
  if (!ctx) throw new Error('useScreel must be used within ScreelProvider');
  return ctx;
}
