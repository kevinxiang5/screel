import { useEffect, useState } from 'react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { Flame, Sparkles, Trophy } from 'lucide-react';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';
import { hapticSuccess } from '../native/haptics';
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
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
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
  const puzzleToday = state.puzzleEarnedToday;

  const xpIntoLevel = ((state.xp % 100) + 100) % 100;
  const visibleChallenges = state.challenges;

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
            'Budget your apps. Earn minutes back with puzzles — Play is optional.'}
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
              <span className="k">Earned today</span>
              <span className="v pos">+{puzzleToday}m</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.section className="section" variants={item}>
        <div className="section-head">
          <h2>
            <span className="idx">01</span> Regain minutes
          </h2>
        </div>
        <div className="home-note">
          <div className="home-note-copy">
            <strong>Skill puzzles · fixed rewards</strong>
            <span>No stake. Cap 30m/day. The cleanest way to earn time back.</span>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('earn')}>
            Earn
          </button>
        </div>
      </motion.section>

      <motion.section className="section" variants={item}>
        <div className="section-head">
          <h2>
            <span className="idx">02</span> Optional challenges
          </h2>
          <button type="button" className="linkish" onClick={() => onNavigate('play')}>
            Play
          </button>
        </div>
        <div className="home-action-grid">
          <button
            type="button"
            className="game-card featured bj home-feature-card"
            onClick={() => onPlay('blackjack')}
          >
            <span className="badge">stake</span>
            <div className="game-card-copy">
              <h3>Twenty-one</h3>
              <p>Optional stake challenge. Bank early or go again once.</p>
            </div>
          </button>
          <div className="home-mini-grid">
            <button type="button" className="game-card plinko" onClick={() => onPlay('plinko')}>
              <span className="badge">drop</span>
              <div className="game-card-copy">
                <h3>Plinko</h3>
                <p>Quick variance.</p>
              </div>
            </button>
            <button type="button" className="game-card bus" onClick={() => onPlay('ridethebus')}>
              <span className="badge">ladder</span>
              <div className="game-card-copy">
                <h3>Ride the bus</h3>
                <p>Longer run.</p>
              </div>
            </button>
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
          <button type="button" className="linkish" onClick={() => onNavigate('you')}>
            You
          </button>
        </div>
        <div className="challenge-list">
          {visibleChallenges.map((c) => {
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
                        void hapticSuccess();
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
                    <span style={{ color: 'var(--accent)' }}>Ready</span>
                  ) : (
                    <span>In progress</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="level-card" style={{ marginTop: 'var(--s4)' }}>
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
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
