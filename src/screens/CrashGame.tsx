import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Rocket } from 'lucide-react';
import { RewardBadge } from '../components/RewardBadge';
import { useScreel } from '../context/ScreelContext';
import { GAME_REWARDS } from '../types';

const REWARD = GAME_REWARDS.crash;
const TARGET = 1.5;
const RATE = 0.00014;

type Stage = 'ready' | 'running' | 'done';

function rollCrashPoint(): number {
  // Mostly above target so skill/timing matters more than instant bust.
  const u = Math.random();
  if (u < 0.12) return 1 + Math.random() * 0.4;
  return 1.5 + Math.random() * 3;
}

function multAt(ms: number): number {
  return Math.exp(RATE * ms);
}

export function CrashGame({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, completeChallenge } = useScreel();
  const [stage, setStage] = useState<Stage>('ready');
  const [mult, setMult] = useState(1);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);
  const crashPointRef = useRef(1);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const stageRef = useRef<Stage>('ready');
  stageRef.current = stage;

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const launch = () => {
    crashPointRef.current = rollCrashPoint();
    startRef.current = performance.now();
    setBanner(null);
    setMult(1);
    setStage('running');

    const tick = (now: number) => {
      if (stageRef.current !== 'running') return;
      const m = multAt(now - startRef.current);
      if (m >= crashPointRef.current) {
        setMult(crashPointRef.current);
        setStage('done');
        completeChallenge({
          game: 'crash',
          success: false,
          detail: `Missed target ×${TARGET} (popped at ×${crashPointRef.current.toFixed(2)})`,
        });
        setBanner({ text: `Popped at ×${crashPointRef.current.toFixed(2)} — no reward.`, kind: 'lose' });
        return;
      }
      setMult(m);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const claim = () => {
    if (stageRef.current !== 'running') return;
    const m = multAt(performance.now() - startRef.current);
    cancelAnimationFrame(rafRef.current);
    setMult(m);
    setStage('done');
    const success = m >= TARGET;
    const awarded = completeChallenge({
      game: 'crash',
      success,
      detail: success
        ? `Claimed at ×${m.toFixed(2)} (target ×${TARGET})`
        : `Claimed early at ×${m.toFixed(2)}`,
    });
    setBanner({
      text: success
        ? awarded > 0
          ? `Claimed at ×${m.toFixed(2)} · +${awarded}m`
          : 'Hit the target — earn cap full today.'
        : `Need ×${TARGET}+ to earn. You stopped at ×${m.toFixed(2)}.`,
      kind: success ? 'win' : 'lose',
    });
  };

  return (
    <div className="screen game-stage">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={stage === 'running'}>
          <ArrowLeft size={16} /> Play
        </button>
        <div className="bj-balance">
          <span>Minutes left</span>
          <strong>{remaining}m</strong>
        </div>
      </div>

      <RewardBadge reward={REWARD} earnLeft={earnLeftToday} />

      <div className={`crash-stage ${stage}`}>
        <motion.div
          className="crash-rocket"
          animate={
            stage === 'running'
              ? { y: -12 - Math.min(60, (mult - 1) * 22), rotate: -8 }
              : stage === 'done' && mult < TARGET
                ? { y: 40, rotate: 65, opacity: 0.4 }
                : { y: 0, rotate: 0 }
          }
        >
          <Rocket size={44} />
        </motion.div>
        <div className={`crash-mult ${stage}`}>×{mult.toFixed(2)}</div>
        <div className="crash-sub">
          {stage === 'ready' && `Claim at ×${TARGET} or higher to earn minutes.`}
          {stage === 'running' && `Target ×${TARGET} — claim when you’re ready.`}
          {stage === 'done' && 'Run over.'}
        </div>
      </div>

      <AnimatePresence>
        {banner && (
          <motion.div
            className={`result-banner ${banner.kind}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {banner.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bj-dock">
        {stage === 'ready' && (
          <button type="button" className="btn btn-primary btn-block" onClick={launch}>
            Start
          </button>
        )}
        {stage === 'running' && (
          <button type="button" className="btn btn-gold btn-block" onClick={claim}>
            Claim {mult >= TARGET ? `(ready +${REWARD}m)` : `(need ×${TARGET})`}
          </button>
        )}
        {stage === 'done' && (
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStage('ready')}>
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
