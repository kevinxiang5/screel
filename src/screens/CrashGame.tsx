import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Rocket } from 'lucide-react';
import { CommitSlider } from '../components/CommitSlider';
import { PotTicker } from '../components/PotTicker';
import { useScreel } from '../context/ScreelContext';
import { crashPot, seedPot } from '../utils/potMath';

const RATE = 0.00014;

type Stage = 'ready' | 'running' | 'done';

function rollCrashPoint(): number {
  const u = Math.random();
  if (u < 0.1) return 1 + Math.random() * 0.35;
  if (u < 0.35) return 1.2 + Math.random() * 0.8;
  return 1.5 + Math.random() * 4;
}

function multAt(ms: number): number {
  return Math.exp(RATE * ms);
}

export function CrashGame({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, settleRound, state, setCommitMinutes } = useScreel();
  const [stage, setStage] = useState<Stage>('ready');
  const [mult, setMult] = useState(1);
  const [base, setBase] = useState(0);
  const [commit, setCommit] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);
  const crashPointRef = useRef(1);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const stageRef = useRef<Stage>('ready');
  const baseRef = useRef(0);
  const commitRef = useRef(0);
  stageRef.current = stage;

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const pot = crashPot(base || seedPot('crash', state.commitMinutes), mult);

  const launch = () => {
    const c = Math.min(state.commitMinutes, remaining);
    setCommit(c);
    commitRef.current = c;
    const b = seedPot('crash', c);
    setBase(b);
    baseRef.current = b;
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
        const applied = settleRound({
          game: 'crash',
          delta: commitRef.current > 0 ? -commitRef.current : 0,
          detail: `Popped at ×${crashPointRef.current.toFixed(2)}`,
          result: 'lose',
        });
        setBanner({
          text:
            commitRef.current > 0
              ? `Popped · ${Math.abs(applied)}m missed`
              : `Popped at ×${crashPointRef.current.toFixed(2)} — pot wiped.`,
          kind: 'lose',
        });
        return;
      }
      setMult(m);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const bankIt = () => {
    if (stageRef.current !== 'running') return;
    const m = multAt(performance.now() - startRef.current);
    cancelAnimationFrame(rafRef.current);
    setMult(m);
    setStage('done');
    const amount = Math.round(crashPot(baseRef.current, m));
    const applied = settleRound({
      game: 'crash',
      delta: amount,
      detail: `Banked at ×${m.toFixed(2)}`,
      result: 'win',
    });
    setBanner({
      text: applied > 0 ? `Banked at ×${m.toFixed(2)} · +${applied}m` : 'Kept — daily keep cap full.',
      kind: 'win',
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

      {stage === 'ready' ? (
        <CommitSlider
          value={state.commitMinutes}
          onChange={setCommitMinutes}
          remaining={remaining}
        />
      ) : (
        <PotTicker pot={pot} earnLeft={earnLeftToday} commit={commit} />
      )}

      <div className={`crash-stage ${stage}`}>
        <motion.div
          className="crash-rocket"
          animate={
            stage === 'running'
              ? { y: -12 - Math.min(80, (mult - 1) * 28), rotate: -8 }
              : stage === 'done' && banner?.kind === 'lose'
                ? { y: 40, rotate: 65, opacity: 0.4 }
                : { y: 0, rotate: 0 }
          }
        >
          <Rocket size={44} />
        </motion.div>
        <div className={`crash-mult ${stage}`}>×{mult.toFixed(2)}</div>
        <div className="crash-sub">
          {stage === 'ready' && 'Bank before it pops to keep the growing pot.'}
          {stage === 'running' && 'Growing — bank it before the pop.'}
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
          <button type="button" className="btn btn-gold btn-block" onClick={bankIt}>
            Bank it ({Math.round(pot)}m)
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
