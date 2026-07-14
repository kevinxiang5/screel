import { Capacitor } from '@capacitor/core';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScreelScreenTime } from '../native/ScreelScreenTime';
import type { DailyChallenge, HistoryEntry, RoundResult, ScreelState, UsageSource } from '../types';

const STORAGE_KEY = 'screel-v1';

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

const defaultState = (): ScreelState => ({
  displayName: 'High Roller',
  connected: false,
  usageSource: 'none',
  ageVerified: false,
  baseLimit: 60,
  minutesBank: 60,
  minutesUsed: 18,
  streak: 3,
  xp: 240,
  level: 4,
  totalWon: 0,
  totalLost: 0,
  biggestWin: 0,
  gamesPlayed: 0,
  history: [],
  challenges: defaultChallenges(),
  soundOn: true,
  riskAlerts: true,
});

function loadState(): ScreelState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as ScreelState;
    return {
      ...defaultState(),
      ...parsed,
      usageSource: parsed.usageSource ?? (parsed.connected ? 'simulated' : 'none'),
      challenges: parsed.challenges?.length ? parsed.challenges : defaultChallenges(),
    };
  } catch {
    return defaultState();
  }
}

interface ScreelContextValue {
  state: ScreelState;
  remaining: number;
  setBaseLimit: (n: number) => void;
  connectScreenTime: (opts?: { source?: UsageSource; minutesUsed?: number }) => void;
  disconnectScreenTime: () => void;
  syncUsageMinutes: (minutes: number) => void;
  settleRound: (payload: {
    game: 'blackjack' | 'roulette';
    wager: number;
    payout: number;
    result: RoundResult;
    detail: string;
  }) => void;
  claimChallenge: (id: string) => void;
  updateProfile: (patch: Partial<Pick<ScreelState, 'displayName' | 'soundOn' | 'riskAlerts' | 'ageVerified'>>) => void;
  resetDay: () => void;
  verifyAge: () => void;
}

const ScreelContext = createContext<ScreelContextValue | null>(null);

export function ScreelProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScreelState>(() => loadState());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const remaining = Math.max(0, state.minutesBank - state.minutesUsed);

  // Pull usage from DeviceActivity App Group + apply ManagedSettings shields when broke.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || state.usageSource !== 'screenTime' || !state.connected) return;

    let cancelled = false;

    const sync = async () => {
      try {
        const usage = await ScreelScreenTime.getTodayUsageMinutes();
        if (cancelled) return;
        let bank = 0;
        setState((s) => {
          bank = s.minutesBank;
          return s.minutesUsed === usage.minutes ? s : { ...s, minutesUsed: usage.minutes };
        });
        await ScreelScreenTime.applyShieldWhenBroke({ broke: bank - usage.minutes <= 0 });
      } catch {
        /* ignore transient native errors */
      }
    };

    void sync();
    const id = window.setInterval(() => void sync(), 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [state.connected, state.usageSource, state.minutesBank]);

  // Restart DeviceActivity budget when the bank ceiling changes while linked.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || state.usageSource !== 'screenTime' || !state.connected) return;
    void ScreelScreenTime.startMonitoring({ budgetMinutes: state.minutesBank }).catch(() => {
      /* picker / auth may be incomplete */
    });
  }, [state.minutesBank, state.connected, state.usageSource]);

  const value = useMemo<ScreelContextValue>(() => {
    return {
      state,
      remaining,
      setBaseLimit: (n) => {
        setState((s) => {
          const next = Math.max(15, Math.min(240, Math.round(n)));
          const delta = next - s.baseLimit;
          return {
            ...s,
            baseLimit: next,
            minutesBank: Math.max(0, s.minutesBank + delta),
          };
        });
      },
      connectScreenTime: (opts) => {
        const source = opts?.source ?? 'simulated';
        setState((s) => ({
          ...s,
          connected: true,
          usageSource: source,
          minutesUsed:
            typeof opts?.minutesUsed === 'number'
              ? Math.max(0, Math.round(opts.minutesUsed))
              : source === 'simulated'
                ? Math.min(s.minutesBank - 5, Math.max(s.minutesUsed, 12 + Math.floor(Math.random() * 20)))
                : s.minutesUsed,
        }));
      },
      disconnectScreenTime: () =>
        setState((s) => ({ ...s, connected: false, usageSource: 'none' })),
      syncUsageMinutes: (minutes) =>
        setState((s) => ({ ...s, minutesUsed: Math.max(0, Math.round(minutes)) })),
      settleRound: ({ game, wager, payout, result, detail }) => {
        setState((s) => {
          const net = payout - wager;
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

          return {
            ...s,
            minutesBank: Math.max(0, s.minutesBank + net),
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
      verifyAge: () => setState((s) => ({ ...s, ageVerified: true })),
      resetDay: () =>
        setState((s) => ({
          ...s,
          minutesBank: s.baseLimit,
          minutesUsed: 0,
          challenges: defaultChallenges(),
          streak: s.streak + 1,
        })),
    };
  }, [state, remaining]);

  return <ScreelContext.Provider value={value}>{children}</ScreelContext.Provider>;
}

export function useScreel() {
  const ctx = useContext(ScreelContext);
  if (!ctx) throw new Error('useScreel must be used within ScreelProvider');
  return ctx;
}
