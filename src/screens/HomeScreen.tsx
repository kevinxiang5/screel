import { motion } from 'framer-motion';
import { Flame, Sparkles, Trophy, Zap } from 'lucide-react';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';
import { GAME_EARN_DAILY_CAP, GAME_REWARDS, type GameId, type TabId } from '../types';

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

export function HomeScreen({
  onNavigate,
  onPlay,
}: {
  onNavigate: (tab: TabId) => void;
  onPlay: (game: GameId) => void;
}) {
  const { state, remaining, earnLeftToday, claimChallenge } = useScreel();
  const { toast } = useScreelUI();
  const usedPct = Math.min(100, Math.round((state.minutesUsed / Math.max(1, state.minutesBank)) * 100));
  const firstName = state.displayName === 'Focus Mode' ? '' : state.displayName.split(' ')[0];

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </div>
        <h1 className="display xl">screel</h1>
        <p className="lede">
          {(state.focusGoal && GOAL_LINES[state.focusGoal]) ||
            'Set a daily minute budget for the apps you choose. Clear short challenges to keep a bonus pot — bank anytime.'}
        </p>
      </motion.div>

      <motion.div
        className="hero-panel"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <div className="bank-row">
          <div>
            <div className="bank-value">{remaining}</div>
            <span className="bank-unit">minutes left today</span>
          </div>
          <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
            <span className={`pill ${state.connected ? 'live' : 'warn'}`}>
              {state.connected
                ? state.usageSource === 'screenTime'
                  ? 'Screen Time linked'
                  : 'Usage linked (demo)'
                : 'Not linked'}
            </span>
            <span className="pill gold">
              <Flame size={14} /> {state.streak} day streak
            </span>
          </div>
        </div>
        <div className="meter">
          <div className="meter-track">
            <div className="meter-fill" style={{ width: `${usedPct}%` }} />
          </div>
          <div className="meter-meta">
            <span>{state.minutesUsed}m used</span>
            <span>
              Earned {state.minutesEarnedToday}/{GAME_EARN_DAILY_CAP}m
            </span>
          </div>
        </div>
      </motion.div>

      <section className="section">
        <div className="section-head">
          <h2>Quick play</h2>
          <button type="button" className="linkish" onClick={() => onNavigate('play')}>
            See all
          </button>
        </div>
        <div className="grid-2">
          <button type="button" className="game-card math" onClick={() => onPlay('math')}>
            <span className="badge">+{GAME_REWARDS.math}m</span>
            <h3>Math sprint</h3>
            <p>Skill challenge — ten answers, thirty seconds.</p>
          </button>
          <button type="button" className="game-card mines" onClick={() => onPlay('mines')}>
            <span className="badge">ladder</span>
            <h3>Safe tiles</h3>
            <p>Grow the pot. Bank anytime.</p>
          </button>
        </div>
        <p className="lede" style={{ marginTop: 10 }}>
          {state.winStreak > 0 ? `${state.winStreak} keep streak · ` : ''}
          {earnLeftToday > 0
            ? `${earnLeftToday}m still keepable from challenges today.`
            : 'Daily keep cap reached — allowance still runs until reset.'}
        </p>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Pulse</h2>
        </div>
        <div className="grid-2">
          <div className="stat-tile">
            <div className="label">Level</div>
            <div className="value">{state.level}</div>
          </div>
          <div className="stat-tile">
            <div className="label">XP</div>
            <div className="value">{state.xp}</div>
          </div>
          <div className="stat-tile">
            <div className="label">Best earn</div>
            <div className="value">+{state.biggestWin}m</div>
          </div>
          <div className="stat-tile">
            <div className="label">Rounds played</div>
            <div className="value">{state.gamesPlayed}</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            <span className="spark">
              <Sparkles size={16} style={{ verticalAlign: -2 }} />
            </span>{' '}
            Daily goals
          </h2>
          <button type="button" className="linkish" onClick={() => onNavigate('bank')}>
            Bank
          </button>
        </div>
        {state.challenges.map((c) => {
          const ready = c.progress >= c.target && !c.claimed;
          return (
            <div className="challenge" key={c.id}>
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
      </section>

      <section className="section">
        <button type="button" className="btn btn-primary btn-block" onClick={() => onNavigate('play')}>
          <Zap size={18} /> Play challenges
        </button>
      </section>
    </div>
  );
}
