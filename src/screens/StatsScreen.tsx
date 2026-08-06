import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bomb, Brain, Bus, Cherry, Dices, Layers, Rocket, Spade, Target } from 'lucide-react';
import type { GameKind, TabId } from '../types';
import { useScreel } from '../context/ScreelContext';
import { useScreelUI } from '../components/ScreelUI';
import { presentTopAppsReport } from '../components/stats/TopAppsReport';
import {
  unusedAllowance,
  UsageHeatmap,
  WeekBars,
  weekOverWeekUsed,
} from '../components/stats/UsageCharts';
import { calendarDayKey } from '../utils/dayPeriod';
import { connectScreenTimeFlow } from '../native/connectScreenTimeFlow';
import { reselectTrackedApps } from '../native/reselectTrackedApps';

const GAME_META: Record<Exclude<GameKind, 'puzzle'>, { label: string; icon: typeof Spade }> = {
  blackjack: { label: 'Twenty-one', icon: Spade },
  roulette: { label: 'Multiplier wheel', icon: Target },
  mines: { label: 'Safe tiles', icon: Bomb },
  crash: { label: 'Timing run', icon: Rocket },
  slots: { label: 'Match three', icon: Cherry },
  hilo: { label: 'Higher / lower', icon: Layers },
  dice: { label: 'Roll under', icon: Dices },
  plinko: { label: 'Plinko', icon: Target },
  ridethebus: { label: 'Ride the bus', icon: Bus },
};

export function StatsScreen({ onNavigate }: { onNavigate?: (tab: TabId) => void }) {
  const { state, connectScreenTime } = useScreel();
  const { toast } = useScreelUI();
  const [showChallenges, setShowChallenges] = useState(false);
  const [busy, setBusy] = useState<'report' | 'pick' | 'link' | null>(null);
  const usageLog = Array.isArray(state.usageDayLog) ? state.usageDayLog : [];
  const periodOpts = {
    resetHour: state.resetHour,
    resetMinute: state.resetMinute,
    timeZone: state.timeZone,
  };
  const liveUsage = {
    used: state.minutesUsed,
    bank: state.minutesBank,
    puzzleEarned: state.puzzleEarnedToday,
  };
  const periodToday = calendarDayKey(
    new Date(),
    state.resetHour,
    state.resetMinute,
    state.timeZone,
  );
  const unused = unusedAllowance(usageLog, periodToday);
  const todayUnused = Math.max(0, (state.minutesBank ?? 0) - (state.minutesUsed ?? 0));
  const wow = weekOverWeekUsed(usageLog, periodOpts, liveUsage);
  const isNativeLink = state.connected && state.usageSource === 'screenTime';

  const openReport = async () => {
    if (busy) return;
    setBusy('report');
    const ok = await presentTopAppsReport();
    setBusy(null);
    if (!ok) {
      toast('Top-app report needs a linked iPhone build with Screen Time.', {
        title: 'Report unavailable',
        tone: 'info',
      });
    }
  };

  const pickApps = async () => {
    if (busy) return;
    setBusy('pick');
    const result = await reselectTrackedApps({
      budgetMinutes: state.baseLimit,
      resetHour: state.resetHour,
      resetMinute: state.resetMinute,
    });
    setBusy(null);
    if (!result.ok) {
      toast(result.message ?? 'Could not open app picker.', {
        title: 'Select apps',
        tone: 'warn',
      });
      return;
    }
    toast(`Tracking ${result.applicationCount ?? 0} selection(s).`, {
      title: 'Apps updated',
      tone: 'success',
    });
  };

  const linkAndPick = async () => {
    if (busy) return;
    setBusy('link');
    const result = await connectScreenTimeFlow({
      budgetMinutes: state.baseLimit,
      resetHour: state.resetHour,
      resetMinute: state.resetMinute,
    });
    setBusy(null);
    if (!result.ok) {
      toast(result.message, { title: result.title, tone: result.tone ?? 'warn' });
      return;
    }
    connectScreenTime({ source: result.mode, minutesUsed: 0 });
    toast(
      result.mode === 'screenTime'
        ? `Linked. Tracking ${result.applicationCount ?? 0} selection(s).`
        : 'Demo link on for this browser session. Real app pick needs the iPhone build.',
      {
        title: result.mode === 'screenTime' ? 'Screen Time linked' : 'Usage simulated',
        tone: 'success',
      },
    );
  };

  return (
    <div className="screen">
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Usage</div>
        <h1 className="display lg">Stats</h1>
        <p className="lede">
          Honest numbers from your Screel budget: unused allowance, not invented doomscroll hours.
        </p>
      </motion.div>

      <div className="hero-panel section">
        <div className="stats-hero">
          <div>
            <div className="label">Unused allowance today</div>
            <div className="stats-hero-value pos">+{todayUnused}m</div>
            <p className="lede" style={{ marginTop: 8 }}>
              {todayUnused}m still in today’s bank · {state.minutesUsed}m used of {state.minutesBank}m ·
              base {state.baseLimit}m.
            </p>
          </div>
          <div className="stats-hero-side">
            <div className="hero-stat">
              <span className="k">Used today</span>
              <span className="v">{state.minutesUsed}m</span>
            </div>
            <div className="hero-stat">
              <span className="k">Archive unused</span>
              <span className="v">{unused}m</span>
            </div>
            <div className="hero-stat">
              <span className="k">Puzzle today</span>
              <span className="v pos">+{state.puzzleEarnedToday}m</span>
            </div>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>
            <span className="idx">01</span> Select apps to track
          </h2>
        </div>
        <div className="stat-tile" style={{ marginBottom: 12 }}>
          <div className="label">Tracked selection · week vs last</div>
          <div className="value">
            {wow.pct == null ? '-' : `${wow.pct > 0 ? '+' : ''}${wow.pct}%`}
          </div>
          <p>
            This week {wow.thisWeek}m · last week {wow.lastWeek}m.
            {state.connected
              ? isNativeLink
                ? ' Screen Time is linked.'
                : ' Demo mode. Link on iPhone to pick real apps.'
              : ' Not linked yet.'}
          </p>
        </div>
        <div className="stats-actions">
          {!state.connected ? (
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={busy !== null}
              onClick={() => void linkAndPick()}
            >
              {busy === 'link' ? 'Connecting…' : 'Link & select apps'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-block"
              disabled={busy !== null}
              onClick={() => void pickApps()}
            >
              {busy === 'pick' ? 'Opening picker…' : 'Select / change apps'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-block"
            disabled={busy !== null || !isNativeLink}
            onClick={() => void openReport()}
          >
            {busy === 'report' ? 'Opening…' : 'Open top-app system report'}
          </button>
          {onNavigate ? (
            <button type="button" className="btn btn-secondary btn-block" onClick={() => onNavigate('you')}>
              Open You for allowance settings
            </button>
          ) : null}
        </div>
        <p className="lede" style={{ fontSize: '0.8rem', marginTop: 8 }}>
          Apple only lets you pick apps in the installed iPhone app. The browser can simulate a link for
          demos.
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            <span className="idx">02</span> Calendar heat
          </h2>
        </div>
        <UsageHeatmap
          log={usageLog}
          resetHour={state.resetHour}
          resetMinute={state.resetMinute}
          timeZone={state.timeZone}
          live={liveUsage}
        />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            <span className="idx">03</span> Last 7 days
          </h2>
        </div>
        <WeekBars
          log={usageLog}
          resetHour={state.resetHour}
          resetMinute={state.resetMinute}
          timeZone={state.timeZone}
          live={liveUsage}
        />
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            <span className="idx">04</span> Challenge results
          </h2>
          <button type="button" className="linkish" onClick={() => setShowChallenges((v) => !v)}>
            {showChallenges ? 'Hide' : 'Show'}
          </button>
        </div>
        {showChallenges ? (
          state.history.length === 0 ? (
            <div className="empty">No rounds yet.</div>
          ) : (
            state.history.slice(0, 40).map((h) => {
              const meta =
                h.game === 'puzzle'
                  ? { label: 'Puzzle', icon: Brain }
                  : GAME_META[h.game as Exclude<GameKind, 'puzzle'>] ?? GAME_META.blackjack;
              const Icon = meta.icon;
              return (
                <div className="history-item" key={h.id}>
                  <div className="history-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4>{meta.label}</h4>
                    <p>
                      {h.detail} ·{' '}
                      {new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className={`delta ${h.delta > 0 ? 'up' : h.delta < 0 ? 'down' : ''}`}>
                    {h.delta > 0 ? `+${h.delta}m` : h.delta < 0 ? `${h.delta}m` : '-'}
                  </div>
                </div>
              );
            })
          )
        ) : (
          <p className="lede" style={{ margin: 0, fontSize: '0.85rem' }}>
            Stake wins and losses stay available here. Usage is the main story now.
          </p>
        )}
      </section>
    </div>
  );
}
