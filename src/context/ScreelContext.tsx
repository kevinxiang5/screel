import { Capacitor } from '@capacitor/core';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScreelScreenTime } from '../native/ScreelScreenTime';
import {
  COMMIT_MAX,
  GAME_EARN_DAILY_CAP,
  type DailyChallenge,
  type FontTheme,
  type GameKind,
  type HistoryEntry,
  type RoundResult,
  type ScreelState,
  type UsageSource,
} from '../types';
import {
  ALLOWANCE_MAX,
  ALLOWANCE_MIN,
  detectTimeZone,
  periodId,
} from '../utils/dayPeriod';
import { hashBankPin, isValidPin, pinsMatch } from '../utils/bankPin';

const STORAGE_KEY = 'screel-v2';

const defaultChallenges = (): DailyChallenge[] => [
  {
    id: 'play-3',
    title: 'Three Rounds',
    description: 'Play 3 challenges today',
    progress: 0,
    target: 3,
    reward: 8,
    claimed: false,
  },
  {
    id: 'win-1',
    title: 'First Keep',
    description: 'Bank a challenge successfully',
    progress: 0,
    target: 1,
    reward: 10,
    claimed: false,
  },
  {
    id: 'earn-15',
    title: 'Focus Boost',
    description: 'Keep 15 minutes from challenges',
    progress: 0,
    target: 15,
    reward: 12,
    claimed: false,
  },
];

function clampAllowance(n: number): number {
  return Math.max(ALLOWANCE_MIN, Math.min(ALLOWANCE_MAX, Math.round(n)));
}

function clampCommit(n: number): number {
  return Math.max(0, Math.min(COMMIT_MAX, Math.round(n)));
}

const defaultState = (): ScreelState => {
  const timeZone = detectTimeZone();
  const resetHour = 4;
  const resetMinute = 0;
  return {
    displayName: 'Focus Mode',
    connected: false,
    usageSource: 'none',
    ageVerified: false,
    ageBlocked: false,
    setupComplete: false,
    focusGoal: null,
    distractions: [],
    fontTheme: 'felt',
    baseLimit: 240,
    minutesBank: 240,
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
    commitMinutes: 0,
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

function loadState(): ScreelState {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('screel-v1');
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<ScreelState> & {
      challenges?: DailyChallenge[];
    };
    const timeZone = parsed.timeZone || detectTimeZone();
    const resetHour = typeof parsed.resetHour === 'number' ? parsed.resetHour : 4;
    const resetMinute = typeof parsed.resetMinute === 'number' ? parsed.resetMinute : 0;
    const baseLimit = clampAllowance(parsed.baseLimit ?? 240);
    const legacyChallenges = parsed.challenges?.some(
      (c) => c.id === 'risk-15' || /wager|felt|high roller/i.test(`${c.title} ${c.description}`),
    );
    return {
      ...base,
      ...parsed,
      baseLimit,
      minutesBank: typeof parsed.minutesBank === 'number' ? Math.max(0, parsed.minutesBank) : baseLimit,
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
      focusGoal: typeof parsed.focusGoal === 'string' ? parsed.focusGoal : null,
      distractions: Array.isArray(parsed.distractions)
        ? parsed.distractions.filter((d): d is string => typeof d === 'string')
        : [],
      fontTheme: (parsed.fontTheme as FontTheme) || 'felt',
      challenges:
        parsed.challenges?.length && !legacyChallenges ? parsed.challenges : defaultChallenges(),
      minutesEarnedToday:
        typeof parsed.minutesEarnedToday === 'number' ? Math.max(0, parsed.minutesEarnedToday) : 0,
      commitMinutes: clampCommit(parsed.commitMinutes ?? 0),
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
  /** Minutes still available to earn from minigames today. */
  earnLeftToday: number;
  setBaseLimit: (n: number) => void;
  setResetTime: (hour: number, minute: number) => void;
  setCommitMinutes: (n: number) => void;
  connectScreenTime: (opts?: { source?: UsageSource; minutesUsed?: number }) => void;
  disconnectScreenTime: () => void;
  syncUsageMinutes: (minutes: number) => void;
  /**
   * Apply a signed minute change from a challenge round.
   * Positive = keep bonus (capped). Negative = miss committed minutes (floors at 0).
   * Returns the actual delta applied to the bank.
   */
  settleRound: (payload: {
    game: GameKind;
    delta: number;
    detail: string;
    result?: RoundResult;
  }) => number;
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
  setFontTheme: (theme: FontTheme) => void;
}

const ScreelContext = createContext<ScreelContextValue | null>(null);

async function restartNativeMonitor(state: ScreelState, resetUsed: boolean) {
  if (!Capacitor.isNativePlatform() || state.usageSource !== 'screenTime' || !state.connected) return;
  await ScreelScreenTime.startMonitoring({
    budgetMinutes: Math.max(1, state.minutesBank),
    resetUsed,
    resetHour: state.resetHour,
    resetMinute: state.resetMinute,
  });
}

export function ScreelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScreelState>(() => loadState());
  const [bankUnlocked, setBankUnlocked] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.font = state.fontTheme;
  }, [state.fontTheme]);

  useEffect(() => {
    const tick = () => {
      setState((s) => {
        const tz = s.timeZone || detectTimeZone();
        const nextId = periodId(new Date(), s.resetHour, s.resetMinute, tz);
        if (nextId === s.activePeriodId) return s.timeZone === tz ? s : { ...s, timeZone: tz };
        return {
          ...s,
          timeZone: tz,
          activePeriodId: nextId,
          minutesBank: s.baseLimit,
          minutesUsed: 0,
          challenges: defaultChallenges(),
          streak: s.streak + 1,
          minutesEarnedToday: 0,
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
    if (!Capacitor.isNativePlatform() || state.usageSource !== 'screenTime' || !state.connected) return;
    if (state.minutesUsed !== 0) return;
    void (async () => {
      try {
        await ScreelScreenTime.resetUsageDay();
        await restartNativeMonitor(state, true);
        await ScreelScreenTime.applyShieldWhenBroke({ broke: false });
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activePeriodId]);

  useEffect(() => {
    setBankUnlocked(false);
  }, [state.activePeriodId]);

  const remaining = Math.max(0, state.minutesBank - state.minutesUsed);
  const earnLeftToday = Math.max(0, GAME_EARN_DAILY_CAP - state.minutesEarnedToday);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || state.usageSource !== 'screenTime' || !state.connected) return;

    let cancelled = false;

    const sync = async () => {
      try {
        const usage = await ScreelScreenTime.getTodayUsageMinutes();
        if (cancelled) return;
        let bank = 0;
        let used = usage.minutes;
        setState((s) => {
          bank = s.minutesBank;
          used = Math.min(usage.minutes, s.minutesBank + 1_000);
          return s.minutesUsed === used ? s : { ...s, minutesUsed: used };
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
  }, [state.connected, state.usageSource, state.minutesBank, state.activePeriodId]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || state.usageSource !== 'screenTime' || !state.connected) return;
    void restartNativeMonitor(state, false).catch(() => undefined);
  }, [state.minutesBank, state.resetHour, state.resetMinute, state.connected, state.usageSource]);

  const value = useMemo<ScreelContextValue>(() => {
    return {
      state,
      remaining,
      earnLeftToday,
      setBaseLimit: (n) => {
        setState((s) => {
          const next = clampAllowance(n);
          const delta = next - s.baseLimit;
          return {
            ...s,
            baseLimit: next,
            minutesBank: Math.max(0, s.minutesBank + delta),
          };
        });
      },
      setResetTime: (hour, minute) => {
        setState((s) => {
          const resetHour = Math.max(0, Math.min(23, Math.round(hour)));
          const resetMinute = Math.max(0, Math.min(59, Math.round(minute)));
          const timeZone = detectTimeZone();
          return {
            ...s,
            resetHour,
            resetMinute,
            timeZone,
            activePeriodId: periodId(new Date(), resetHour, resetMinute, timeZone),
          };
        });
      },
      setCommitMinutes: (n) => setState((s) => ({ ...s, commitMinutes: clampCommit(n) })),
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
        setState((s) => ({ ...s, minutesUsed: Math.max(0, Math.round(minutes)) })),
      settleRound: ({ game, delta: wanted, detail, result }) => {
        let applied = 0;
        let shouldClear = false;
        let shouldShield = false;
        setState((s) => {
          const room = Math.max(0, GAME_EARN_DAILY_CAP - s.minutesEarnedToday);
          if (wanted > 0) {
            applied = Math.min(wanted, room);
          } else if (wanted < 0) {
            applied = -Math.min(Math.abs(wanted), Math.max(0, s.minutesBank - s.minutesUsed));
          } else {
            applied = 0;
          }

          const nextBank = Math.max(0, s.minutesBank + applied);
          const kept = applied > 0;
          const missed = applied < 0;

          const entry: HistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            game,
            delta: applied,
            result: result ?? (kept ? 'win' : missed ? 'lose' : 'push'),
            detail,
            at: Date.now(),
          };

          const challenges = s.challenges.map((c) => {
            if (c.claimed) return c;
            if (c.id === 'play-3') return { ...c, progress: Math.min(c.target, c.progress + 1) };
            if (c.id === 'win-1' && kept) {
              return { ...c, progress: Math.min(c.target, c.progress + 1) };
            }
            if (c.id === 'earn-15' && kept) {
              return { ...c, progress: Math.min(c.target, c.progress + applied) };
            }
            return c;
          });

          const xpGain = kept ? (result === 'blackjack' ? 35 : 22) : missed ? 4 : 6;
          const nextRemaining = nextBank - s.minutesUsed;
          shouldClear =
            kept && s.usageSource === 'screenTime' && s.connected && nextRemaining > 0;
          shouldShield =
            missed && s.usageSource === 'screenTime' && s.connected && nextRemaining <= 0;

          return {
            ...s,
            minutesBank: nextBank,
            minutesEarnedToday: s.minutesEarnedToday + Math.max(0, applied),
            totalWon: s.totalWon + Math.max(0, applied),
            totalLost: s.totalLost + Math.max(0, -applied),
            biggestWin: Math.max(s.biggestWin, Math.max(0, applied)),
            gamesPlayed: s.gamesPlayed + 1,
            winStreak: kept ? s.winStreak + 1 : missed ? 0 : s.winStreak,
            xp: s.xp + xpGain,
            level: Math.max(1, Math.floor((s.xp + xpGain) / 100) + 1),
            history: [entry, ...s.history].slice(0, 40),
            challenges,
          };
        });
        if (shouldClear) void ScreelScreenTime.applyShieldWhenBroke({ broke: false });
        if (shouldShield) void ScreelScreenTime.applyShieldWhenBroke({ broke: true });
        return applied;
      },
      claimChallenge: (id) => {
        setState((s) => {
          const challenge = s.challenges.find((c) => c.id === id);
          if (!challenge || challenge.claimed || challenge.progress < challenge.target) return s;
          return {
            ...s,
            minutesBank: s.minutesBank + challenge.reward,
            totalWon: s.totalWon + challenge.reward,
            challenges: s.challenges.map((c) => (c.id === id ? { ...c, claimed: true } : c)),
            xp: s.xp + 20,
          };
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
          connected: false,
          usageSource: 'none',
        })),
      completeSetup: () => setState((s) => ({ ...s, setupComplete: true })),
      setFontTheme: (theme) => setState((s) => ({ ...s, fontTheme: theme })),
      resetDay: () =>
        setState((s) => {
          const timeZone = detectTimeZone();
          return {
            ...s,
            minutesBank: s.baseLimit,
            minutesUsed: 0,
            challenges: defaultChallenges(),
            streak: s.streak + 1,
            timeZone,
            activePeriodId: periodId(new Date(), s.resetHour, s.resetMinute, timeZone),
            minutesEarnedToday: 0,
          };
        }),
    };
  }, [state, remaining, earnLeftToday, bankUnlocked]);

  return <ScreelContext.Provider value={value}>{children}</ScreelContext.Provider>;
}

export function useScreel() {
  const ctx = useContext(ScreelContext);
  if (!ctx) throw new Error('useScreel must be used within ScreelProvider');
  return ctx;
}
