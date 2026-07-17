import { Capacitor } from '@capacitor/core';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScreelScreenTime } from '../native/ScreelScreenTime';
import {
  AD_RESCUE_DAILY_CAP,
  AD_RESCUE_MINUTES,
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

const STORAGE_KEY = 'screel-v2';

const defaultChallenges = (): DailyChallenge[] => [
  {
    id: 'play-3',
    title: 'Warm the Felt',
    description: 'Play 3 rounds today',
    progress: 0,
    target: 3,
    reward: 8,
    claimed: false,
  },
  {
    id: 'win-1',
    title: 'First Blood',
    description: 'Win a single wager',
    progress: 0,
    target: 1,
    reward: 12,
    claimed: false,
  },
  {
    id: 'risk-15',
    title: 'High Roller',
    description: 'Wager 15+ minutes in one bet',
    progress: 0,
    target: 1,
    reward: 15,
    claimed: false,
  },
];

function clampAllowance(n: number): number {
  return Math.max(ALLOWANCE_MIN, Math.min(ALLOWANCE_MAX, Math.round(n)));
}

const defaultState = (): ScreelState => {
  const timeZone = detectTimeZone();
  const resetHour = 4;
  const resetMinute = 0;
  return {
    displayName: 'High Roller',
    connected: false,
    usageSource: 'none',
    ageVerified: false,
    ageBlocked: false,
    setupComplete: false,
    fontTheme: 'felt',
    baseLimit: 240,
    minutesBank: 240,
    minutesUsed: 0,
    resetHour,
    resetMinute,
    timeZone,
    activePeriodId: periodId(new Date(), resetHour, resetMinute, timeZone),
    streak: 0,
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
    adRescuesUsed: 0,
  };
};

function loadState(): ScreelState {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('screel-v1');
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<ScreelState>;
    const timeZone = parsed.timeZone || detectTimeZone();
    const resetHour = typeof parsed.resetHour === 'number' ? parsed.resetHour : 4;
    const resetMinute = typeof parsed.resetMinute === 'number' ? parsed.resetMinute : 0;
    const baseLimit = clampAllowance(parsed.baseLimit ?? 240);
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
      // Fresh installs always see setup. Older installs that never linked Screen Time see it once.
      setupComplete:
        typeof parsed.setupComplete === 'boolean'
          ? parsed.setupComplete
          : Boolean(parsed.ageVerified && parsed.connected),
      fontTheme: (parsed.fontTheme as FontTheme) || 'felt',
      challenges: parsed.challenges?.length ? parsed.challenges : defaultChallenges(),
      adRescuesUsed: typeof parsed.adRescuesUsed === 'number' ? Math.max(0, parsed.adRescuesUsed) : 0,
    };
  } catch {
    return base;
  }
}

interface ScreelContextValue {
  state: ScreelState;
  remaining: number;
  setBaseLimit: (n: number) => void;
  setResetTime: (hour: number, minute: number) => void;
  connectScreenTime: (opts?: { source?: UsageSource; minutesUsed?: number }) => void;
  disconnectScreenTime: () => void;
  syncUsageMinutes: (minutes: number) => void;
  settleRound: (payload: {
    game: GameKind;
    wager: number;
    payout: number;
    result: RoundResult;
    detail: string;
  }) => void;
  claimChallenge: (id: string) => void;
  /** Rewarded-ad rescues left today. */
  adRescuesLeft: number;
  /** Credit minutes after a completed rewarded ad. Returns false when capped. */
  claimAdRescue: () => boolean;
  updateProfile: (
    patch: Partial<
      Pick<ScreelState, 'displayName' | 'soundOn' | 'riskAlerts' | 'ageVerified' | 'fontTheme' | 'setupComplete'>
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.font = state.fontTheme;
  }, [state.fontTheme]);

  // Auto-roll allowance when the local reset time is crossed.
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
          adRescuesUsed: 0,
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

  // After auto-reset, restart native monitoring with a clean used counter.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on period
  }, [state.activePeriodId]);

  const remaining = Math.max(0, state.minutesBank - state.minutesUsed);

  // Sync DeviceActivity usage → never trust "already used today" from Settings.
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
        // Shield as soon as the Screel pile is empty (usage or casino).
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

  // Keep DeviceActivity budget aligned with bank / reset clock.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || state.usageSource !== 'screenTime' || !state.connected) return;
    void restartNativeMonitor(state, false).catch(() => undefined);
  }, [state.minutesBank, state.resetHour, state.resetMinute, state.connected, state.usageSource]);

  const value = useMemo<ScreelContextValue>(() => {
    return {
      state,
      remaining,
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
            // Keep current period id; next rollover check will migrate cleanly.
            activePeriodId: periodId(new Date(), resetHour, resetMinute, timeZone),
          };
        });
      },
      connectScreenTime: (opts) => {
        const source = opts?.source ?? 'simulated';
        setState((s) => {
          const timeZone = detectTimeZone();
          const used =
            typeof opts?.minutesUsed === 'number'
              ? Math.max(0, Math.round(opts.minutesUsed))
              : source === 'simulated'
                ? 0
                : 0;
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
      settleRound: ({ game, wager, payout, result, detail }) => {
        let shouldShield = false;
        let shouldClear = false;
        setState((s) => {
          const net = payout - wager;
          const nextBank = Math.max(0, s.minutesBank + net);
          const entry: HistoryEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            game,
            wager,
            payout,
            result,
            detail,
            at: Date.now(),
          };

          const challenges = s.challenges.map((c) => {
            if (c.claimed) return c;
            if (c.id === 'play-3') return { ...c, progress: Math.min(c.target, c.progress + 1) };
            if (c.id === 'win-1' && (result === 'win' || result === 'blackjack')) {
              return { ...c, progress: Math.min(c.target, c.progress + 1) };
            }
            if (c.id === 'risk-15' && wager >= 15) {
              return { ...c, progress: Math.min(c.target, c.progress + 1) };
            }
            return c;
          });

          const xpGain = result === 'blackjack' ? 40 : result === 'win' ? 25 : result === 'push' ? 8 : 5;
          const broke = nextBank - s.minutesUsed <= 0;
          shouldShield = s.usageSource === 'screenTime' && s.connected && broke;
          shouldClear = s.usageSource === 'screenTime' && s.connected && !broke;

          return {
            ...s,
            minutesBank: nextBank,
            totalWon: s.totalWon + Math.max(0, net),
            totalLost: s.totalLost + Math.max(0, -net),
            biggestWin: Math.max(s.biggestWin, Math.max(0, net)),
            gamesPlayed: s.gamesPlayed + 1,
            xp: s.xp + xpGain,
            level: Math.max(1, Math.floor((s.xp + xpGain) / 100) + 1),
            history: [entry, ...s.history].slice(0, 40),
            challenges,
          };
        });
        if (shouldShield) void ScreelScreenTime.applyShieldWhenBroke({ broke: true });
        else if (shouldClear) void ScreelScreenTime.applyShieldWhenBroke({ broke: false });
      },
      adRescuesLeft: Math.max(0, AD_RESCUE_DAILY_CAP - state.adRescuesUsed),
      claimAdRescue: () => {
        if (state.adRescuesUsed >= AD_RESCUE_DAILY_CAP) return false;
        let shouldClear = false;
        setState((s) => {
          if (s.adRescuesUsed >= AD_RESCUE_DAILY_CAP) return s;
          const nextBank = s.minutesBank + AD_RESCUE_MINUTES;
          shouldClear = s.usageSource === 'screenTime' && s.connected && nextBank - s.minutesUsed > 0;
          return {
            ...s,
            minutesBank: nextBank,
            adRescuesUsed: s.adRescuesUsed + 1,
          };
        });
        if (shouldClear) void ScreelScreenTime.applyShieldWhenBroke({ broke: false });
        return true;
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
            adRescuesUsed: 0,
          };
        }),
    };
  }, [state, remaining]);

  return <ScreelContext.Provider value={value}>{children}</ScreelContext.Provider>;
}

export function useScreel() {
  const ctx = useContext(ScreelContext);
  if (!ctx) throw new Error('useScreel must be used within ScreelProvider');
  return ctx;
}
