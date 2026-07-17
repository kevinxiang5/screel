import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Rocket } from 'lucide-react';
import { WagerBar } from '../components/WagerBar';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';

const HOUSE = 0.97;
/** Multiplier growth rate — doubles roughly every 5.5s. */
const RATE = 0.000126;

type Stage = 'idle' | 'running' | 'crashed' | 'cashed';

/** House-edged crash point: 3% instant bust, otherwise HOUSE/(1-U). */
function rollCrashPoint(): number {
  const u = Math.random();
  if (u < 0.03) return 1;
  return Math.max(1, Math.floor((HOUSE / (1 - u)) * 100) / 100);
}

function multAt(ms: number): number {
  return Math.exp(RATE * ms);
}

export function CrashGame({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound } = useScreel();
  const { toast } = useScreelUI();
  const [wager, setWager] = useState(0);
  const [stage, setStage] = useState<Stage>('idle');
  const [mult, setMult] = useState(1);
  const [history, setHistory] = useState<number[]>([]);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const crashPointRef = useRef(1);
  const startRef = useRef(0);
  const rafRef = useRef(0);
  const stageRef = useRef<Stage>('idle');
  stageRef.current = stage;

  const running = stage === 'running';

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const launch = () => {
    if (wager < 1 || wager > remaining) {
      toast('Set a wager within your bank first.', { title: 'No chips down', tone: 'warn' });
      return;
    }
    crashPointRef.current = rollCrashPoint();
    startRef.current = performance.now();
    setBanner(null);
    setMult(1);
    setStage('running');

    const tick = (now: number) => {
      if (stageRef.current !== 'running') return;
      const m = multAt(now - startRef.current);
      if (m >= crashPointRef.current) {
        const point = crashPointRef.current;
        setMult(point);
        setStage('crashed');
        setHistory((h) => [point, ...h].slice(0, 10));
        setBanner({ text: `Crashed at ×${point.toFixed(2)} · −${wager}m`, kind: 'lose' });
        settleRound({
          game: 'crash',
          wager,
          payout: 0,
          result: 'lose',
          detail: `Crashed at ×${point.toFixed(2)}`,
        });
        return;
      }
      setMult(m);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const cashOut = () => {
    if (stageRef.current !== 'running') return;
    const m = multAt(performance.now() - startRef.current);
    const payout = Math.floor(wager * m);
    cancelAnimationFrame(rafRef.current);
    setMult(m);
    setStage('cashed');
    setHistory((h) => [crashPointRef.current, ...h].slice(0, 10));
    setBanner({ text: `Ejected at ×${m.toFixed(2)} · +${payout - wager}m`, kind: 'win' });
    settleRound({
      game: 'crash',
      wager,
      payout,
      result: payout > wager ? 'win' : 'push',
      detail: `Cashed at ×${m.toFixed(2)} (crash was ×${crashPointRef.current.toFixed(2)})`,
    });
  };

  const reset = () => {
    setStage('idle');
    setMult(1);
  };

  return (
    <div className="screen game-stage">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={running}>
          <ArrowLeft size={16} /> Floor
        </button>
        <div className="bj-balance">
          <span>Balance</span>
          <strong>{Math.max(0, remaining - (running ? wager : 0))}m</strong>
        </div>
      </div>

      <div className="rl-history" style={{ marginBottom: 10 }}>
        <span className="hand-label">Last runs</span>
        <div className="rl-history-row">
          {history.length === 0 && <span className="mute">—</span>}
          {history.map((n, i) => (
            <span key={`${n}-${i}`} className={`rl-hist ${n >= 2 ? 'green' : 'red'}`}>
              {n.toFixed(2)}
            </span>
          ))}
        </div>
      </div>

      <div className={`crash-stage ${stage}`}>
        <motion.div
          className="crash-rocket"
          animate={
            running
              ? { y: -12 - Math.min(60, (mult - 1) * 22), rotate: -8 }
              : stage === 'crashed'
                ? { y: 40, rotate: 65, opacity: 0.4 }
                : { y: 0, rotate: 0 }
          }
          transition={{ type: 'tween', duration: 0.3 }}
        >
          <Rocket size={44} />
        </motion.div>
        <div className={`crash-mult ${stage}`}>×{mult.toFixed(2)}</div>
        <div className="crash-sub">
          {stage === 'idle' && 'Cash out before it blows.'}
          {running && `Riding… potential ${Math.floor(wager * mult)}m`}
          {stage === 'crashed' && 'Gone. The multiplier ate your chips.'}
          {stage === 'cashed' && 'Clean exit.'}
        </div>
      </div>

      <AnimatePresence>
        {banner && (
          <motion.div
            className={`result-banner ${banner.kind}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {banner.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bj-dock">
        {stage === 'idle' && (
          <>
            <WagerBar wager={wager} onChange={setWager} max={remaining} />
            <button type="button" className="btn btn-primary btn-block" onClick={launch} disabled={wager < 1}>
              Launch · {wager}m
            </button>
          </>
        )}
        {running && (
          <button type="button" className="btn btn-gold btn-block" onClick={cashOut}>
            Cash out {Math.floor(wager * mult)}m
          </button>
        )}
        {(stage === 'crashed' || stage === 'cashed') && (
          <button type="button" className="btn btn-primary btn-block" onClick={reset}>
            Ride again
          </button>
        )}
      </div>
    </div>
  );
}
