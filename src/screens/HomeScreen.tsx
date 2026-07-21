import { useEffect, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Flame, Sparkles, Trophy } from 'lucide-react';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';
import type { GameId, TabId } from '../types';

const GOAL_LINES: Record<string, string> = {
  scroll: 'Less scrolling, more living. Your budget keeps the feed in check.',
  sleep: 'Earlier nights start with tighter days. Your budget has your back.',
  focus: 'Deep work needs quiet apps. Your budget holds the line.',
  present: 'Look up more. Your budget keeps the phone in its place.',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Ease-out count-up for the hero number — makes the value feel alive on entry. */
function useCountUp(target: number, duration = 950): number {
  const reduce = useReducedMotion();
  const [value, setValue] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);

  return value;
}

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

export function HomeScreen({
  onNavigate,
  onPlay,
}: {
  onNavigate: (tab: TabId) => void;
  onPlay: (game: GameId) => void;
}) {
  const { state, remaining, claimChallenge } = useScreel();
  const { toast } = useScreelUI();
  const firstName = state.displayName === 'Focus Mode' ? '' : state.displayName.split(' ')[0];

  const now = new Date();
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
  const dateLine = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const ringMax = Math.max(state.minutesBank, remaining, 1);
  const ringPct = Math.max(0, Math.min(100, (remaining / ringMax) * 100));
  const ringOffset = RING_C * (1 - ringPct / 100);
  const shownMinutes = useCountUp(remaining);

  const xpIntoLevel = ((state.xp % 100) + 100) % 100;
  const readyCount = state.challenges.filter((c) => c.progress >= c.target && !c.claimed).length;

  return (
    <motion.div className="screen home" variants={container} initial="hidden" animate="show">
      <motion.header variants={item}>
        <div className="home-head">
          <div>
            <div className="eyebrow">
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </div>
          </div>
          <div className="home-date">
            {weekday}
            <br />
            {dateLine}
          </div>
        </div>
        <h1 className="display xl brand-mark">
          scree<span className="dot">l</span>
        </h1>
        <p className="lede">
          {(state.focusGoal && GOAL_LINES[state.focusGoal]) ||
            'Set a daily minute budget for the apps you choose. Stake minutes on short challenges to win more.'}
        </p>
      </motion.header>

      <motion.div className="hero-panel" variants={item}>
        <div className="home-hero">
          <div className="gauge" role="img" aria-label={`${remaining} minutes left of ${state.minutesBank}`}>
            <svg viewBox="0 0 120 120">
              <circle className="gauge-track" cx="60" cy="60" r={RING_R} strokeWidth="10" />
              <circle
                className="gauge-fill"
                cx="60"
                cy="60"
                r={RING_R}
                strokeWidth="10"
                stroke="url(#gaugeGrad)"
                strokeDasharray={RING_C}
                strokeDashoffset={ringOffset}
              />
              <defs>
                <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f0c94d" />
                  <stop offset="100%" stopColor="#c8ff2e" />
                </linearGradient>
              </defs>
            </svg>
            <div className="gauge-center">
              <div className="gauge-num">{shownMinutes}</div>
              <div className="gauge-label">min left</div>
            </div>
          </div>

          <div className="hero-side">
            <div className="hero-pills">
              <span className={`pill ${state.connected ? 'live' : 'warn'}`}>
                <span className={`live-dot ${state.connected ? 'on' : ''}`} />
                {state.connected
                  ? state.usageSource === 'screenTime'
                    ? 'Screen Time'
                    : 'Linked'
                  : 'Not linked'}
              </span>
              <span className="pill gold">
                <Flame size={14} /> {state.streak}d
              </span>
            </div>
            <div className="hero-stat">
              <span className="k">Used today</span>
              <span className="v">{state.minutesUsed}m</span>
            </div>
            <div className="hero-stat">
              <span className="k">Won today</span>
              <span className="v pos">+{state.minutesEarnedToday}m</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.section className="section" variants={item}>
        <div className="section-head">
          <h2>
            <span className="idx">01</span> Quick play
          </h2>
          <button type="button" className="linkish" onClick={() => onNavigate('play')}>
            See all
          </button>
        </div>
        <div className="grid-2">
          <button type="button" className="game-card bj" onClick={() => onPlay('blackjack')}>
            <span className="badge">stake</span>
            <h3>Twenty-one</h3>
            <p>Beat the house. Bank or double.</p>
          </button>
          <button type="button" className="game-card plinko" onClick={() => onPlay('plinko')}>
            <span className="badge">drop</span>
            <h3>Plinko</h3>
            <p>Drop the ball. Edge bins pay more.</p>
          </button>
        </div>
      </motion.section>

      <motion.section className="section" variants={item}>
        <div className="section-head">
          <h2>
            <span className="idx">02</span> Your progress
          </h2>
          <button type="button" className="linkish" onClick={() => onNavigate('stats')}>
            Stats
          </button>
        </div>
        <div className="level-card">
          <div className="level-badge">
            <div className="n">{state.level}</div>
            <div className="cap">lvl</div>
          </div>
          <div className="level-body">
            <div className="row">
              <span className="t">Level {state.level}</span>
              <span className="x">{xpIntoLevel} / 100 XP</span>
            </div>
            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${xpIntoLevel}%` }} />
            </div>
            <div className="row">
              <span className="x">{100 - xpIntoLevel} XP to level {state.level + 1}</span>
              {state.winStreak > 0 ? (
                <span className="x" style={{ color: 'var(--lime)' }}>
                  {state.winStreak} win streak
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="grid-2" style={{ marginTop: 'var(--s3)' }}>
          <div className="stat-tile">
            <div className="label">Best earn</div>
            <div className="value">+{state.biggestWin}m</div>
          </div>
          <div className="stat-tile">
            <div className="label">Rounds played</div>
            <div className="value">{state.gamesPlayed}</div>
          </div>
        </div>
      </motion.section>

      <motion.section className="section" variants={item}>
        <div className="section-head">
          <h2>
            <span className="idx">03</span>
            <span className="spark">
              <Sparkles size={15} style={{ verticalAlign: -2 }} />
            </span>{' '}
            Daily goals
          </h2>
          <button type="button" className="linkish" onClick={() => onNavigate('bank')}>
            Bank
          </button>
        </div>
        {readyCount > 0 ? (
          <p className="lede" style={{ marginTop: 0, marginBottom: 'var(--s4)', color: 'var(--lime)' }}>
            {readyCount} reward{readyCount > 1 ? 's' : ''} ready to claim.
          </p>
        ) : null}
        {state.challenges.map((c) => {
          const ready = c.progress >= c.target && !c.claimed;
          return (
            <div className={`challenge ${ready ? 'ready' : ''} ${c.claimed ? 'claimed' : ''}`} key={c.id}>
              <div className="challenge-top">
                <div>
                  <h3>{c.title}</h3>
                  <p>{c.description}</p>
                </div>
                {ready ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-gold"
                    onClick={() => {
                      claimChallenge(c.id);
                      toast(`+${c.reward}m added to your allowance.`, {
                        title: `${c.title} claimed`,
                        tone: 'success',
                      });
                    }}
                  >
                    Claim +{c.reward}m
                  </button>
                ) : (
                  <span className="pill gold">+{c.reward}m</span>
                )}
              </div>
              <div className="meter-track">
                <div
                  className="meter-fill"
                  style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%` }}
                />
              </div>
              <div className="meter-meta">
                <span>
                  {c.progress}/{c.target}
                </span>
                {c.claimed ? (
                  <span>
                    <Trophy size={12} /> Claimed
                  </span>
                ) : ready ? (
                  <span style={{ color: 'var(--lime)' }}>Ready to claim</span>
                ) : (
                  <span>In progress</span>
                )}
              </div>
            </div>
          );
        })}
      </motion.section>
    </motion.div>
  );
}
