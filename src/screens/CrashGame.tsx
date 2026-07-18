import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Rocket } from 'lucide-react';
import { PotTicker } from '../components/PotTicker';
import { WagerSelector } from '../components/WagerSelector';
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
  const { remaining, earnLeftToday, settleRound, consumeChallenge, state, setWagerMinutes } = useScreel();
  const [stage, setStage] = useState<Stage>('ready');
  const [mult, setMult] = useState(1);
  const [base, setBase] = useState(0);
  const [autoBank, setAutoBank] = useState<number | null>(null);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);
  const crashPointRef = useRef(1);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const stageRef = useRef<Stage>('ready');
  const baseRef = useRef(0);
  const stakeRef = useRef(0);
  stageRef.current = stage;

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const pot = crashPot(base || seedPot('crash', Math.min(state.wagerMinutes, remaining, earnLeftToday)), mult);

  const launch = () => {
    if (earnLeftToday < 1) {
      setBanner({ text: 'Daily winnings cap reached. Come back after reset.', kind: 'lose' });
      return;
    }
    if (remaining < 1) {
      setBanner({ text: 'No minutes available to stake.', kind: 'lose' });
      return;
    }
    if (!consumeChallenge()) {
      setBanner({ text: 'Daily challenges used — refill from the Play screen.', kind: 'lose' });
      return;
    }
    const stake = Math.min(state.wagerMinutes, remaining, earnLeftToday);
    stakeRef.current = stake;
    const b = seedPot('crash', stake);
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
        const amount = Math.round(crashPot(baseRef.current, autoBank));
        const applied = settleRound({
          game: 'crash',
          pot: amount,
          kept: true,
          wager: stakeRef.current,
          detail: `Auto-banked at ×${autoBank.toFixed(2)}`,
          result: 'win',
        });
        setBanner({
          text: applied > 0 ? `Auto-banked at ×${autoBank.toFixed(2)} · +${applied}m` : 'Win recorded — daily winnings cap reached.',
          kind: 'win',
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
      pot: amount,
      kept: true,
      wager: stakeRef.current,
      detail: `Banked at ×${m.toFixed(2)}`,
      result: 'win',
    });
    setBanner({
      text: applied > 0 ? `Banked at ×${m.toFixed(2)} · +${applied}m` : 'Win recorded — daily winnings cap reached.',
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

      <PotTicker
        pot={pot}
        earnLeft={earnLeftToday}
        wager={stakeRef.current || Math.min(state.wagerMinutes, remaining, earnLeftToday)}
      />

      {(stage === 'ready' || stage === 'done') && (
        <WagerSelector value={state.wagerMinutes} remaining={remaining} limit={earnLeftToday} onChange={setWagerMinutes} />
      )}

      {(stage === 'ready' || stage === 'done') && (
        <div className="option-strip">
          <span className="hand-label">Auto-bank</span>
          {[null, 1.5, 2, 3].map((target) => (
            <button
              type="button"
              key={target ?? 'off'}
              className={autoBank === target ? 'active' : ''}
              onClick={() => setAutoBank(target)}
            >
              {target === null ? 'Off' : `×${target.toFixed(1)}`}
            </button>
          ))}
        </div>
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
          {stage === 'ready' && 'Bank before it pops to win the growing payout.'}
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
