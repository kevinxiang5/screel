import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { GameChrome } from '../components/GameChrome';
import { WagerSelector } from '../components/WagerSelector';
import { useScreel } from '../context/ScreelContext';
import { crashPot, rollCrashPoint } from '../utils/potMath';

const RATE = 0.00014;

type Stage = 'ready' | 'running' | 'done';

function multAt(ms: number): number {
  return Math.exp(RATE * ms);
}

export function CrashGame({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound, state, setWagerMinutes } = useScreel();
  const [stage, setStage] = useState<Stage>('ready');
  const [mult, setMult] = useState(1);
  const [autoBank, setAutoBank] = useState<number | null>(null);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);
  const crashPointRef = useRef(1);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const stageRef = useRef<Stage>('ready');
  const stakeRef = useRef(0);
  stageRef.current = stage;

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const stakePreview = stakeRef.current || Math.min(state.wagerMinutes, remaining);
  const pot = crashPot(stakePreview, mult);

  const launch = () => {
    if (remaining < 1) {
      setBanner({ text: 'No minutes available to stake.', kind: 'lose' });
      return;
    }
    const stake = Math.min(state.wagerMinutes, remaining);
    stakeRef.current = stake;
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
        settleRound({
          game: 'crash',
          pot: 0,
          kept: false,
          wager: stakeRef.current,
          detail: `Popped at ×${crashPointRef.current.toFixed(2)}`,
          result: 'lose',
        });
        setBanner({
          text: `Popped at ×${crashPointRef.current.toFixed(2)} · lost ${stakeRef.current}m`,
          kind: 'lose',
        });
        return;
      }
      if (autoBank !== null && m >= autoBank) {
        cancelAnimationFrame(rafRef.current);
        setMult(autoBank);
        setStage('done');
        const amount = crashPot(stakeRef.current, autoBank);
        const applied = settleRound({
          game: 'crash',
          pot: amount,
          kept: true,
          wager: stakeRef.current,
          detail: `Auto-banked at ×${autoBank.toFixed(2)}`,
          result: 'win',
        });
        setBanner({ text: `Auto-banked at ×${autoBank.toFixed(2)} · +${applied}m`, kind: 'win' });
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
    const amount = crashPot(stakeRef.current, m);
    const applied = settleRound({
      game: 'crash',
      pot: amount,
      kept: true,
      wager: stakeRef.current,
      detail: `Banked at ×${m.toFixed(2)}`,
      result: 'win',
    });
    setBanner({ text: `Banked at ×${m.toFixed(2)} · +${applied}m`, kind: 'win' });
  };

  return (
    <GameChrome
      title="Timing run"
      onBack={onBack}
      backDisabled={stage === 'running'}
      banner={banner}
      setup={
        <>
          <WagerSelector
            value={state.wagerMinutes}
            remaining={remaining}
            onChange={setWagerMinutes}
            disabled={stage === 'running'}
          />
          <div className={`option-strip ${stage === 'running' ? 'locked' : ''}`}>
            <span className="hand-label">Auto-bank</span>
            {[null, 1.5, 2, 3].map((target) => (
              <button
                type="button"
                key={target ?? 'off'}
                className={autoBank === target ? 'active' : ''}
                disabled={stage === 'running'}
                onClick={() => setAutoBank(target)}
              >
                {target === null ? 'Off' : `×${target.toFixed(1)}`}
              </button>
            ))}
          </div>
        </>
      }
      dock={
        <>
          {stage === 'ready' && (
            <button type="button" className="btn btn-primary btn-block" onClick={launch}>
              Start
            </button>
          )}
          {stage === 'running' && (
            <button type="button" className="btn btn-gold btn-block" onClick={bankIt}>
              Bank it (+{pot}m)
            </button>
          )}
          {stage === 'done' && (
            <button type="button" className="btn btn-primary btn-block" onClick={launch}>
              Run again
            </button>
          )}
        </>
      }
    >
      <div className={`crash-stage ${stage}`}>
        <motion.div
          className="crash-rocket"
          animate={
            stage === 'running'
              ? { y: -12 - Math.min(80, (mult - 1) * 28), rotate: -8 }
              : stage === 'done' && banner?.kind === 'lose'
                ? { y: 40, rotate: 65, opacity: 0.4 }
                : { y: 0, rotate: 0, opacity: 1 }
          }
          transition={{ type: 'spring', stiffness: 120, damping: 18 }}
        >
          <Rocket size={44} />
        </motion.div>
        <div className={`crash-mult ${stage}`}>×{mult.toFixed(2)}</div>
        <div className="crash-sub">
          {stage === 'ready' && 'Bank before it pops. Payout = stake × (multiplier − 1).'}
          {stage === 'running' && `+${pot}m if you bank now`}
          {stage === 'done' && 'Run over.'}
        </div>
      </div>
    </GameChrome>
  );
}
