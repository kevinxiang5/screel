import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { PotTicker } from '../components/PotTicker';
import { WagerSelector } from '../components/WagerSelector';
import { useScreel } from '../context/ScreelContext';
import {
  WHEEL_ORDER,
  WHEEL_SLICE,
  WHEEL_TIERS,
  chanceFor,
  colorFor,
  spinIndex,
} from '../utils/wheel';

type Stage = 'ready' | 'spinning' | 'done';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mod360(n: number) {
  return ((n % 360) + 360) % 360;
}

function spinDelta(current: number, targetMod: number, spins: number) {
  const cur = mod360(current);
  const target = mod360(targetMod);
  let d = mod360(target - cur);
  if (d === 0) d = 360;
  return d + 360 * spins;
}

function wheelGradient() {
  const parts = WHEEL_ORDER.map((mult, i) => {
    const a0 = i * WHEEL_SLICE;
    const a1 = (i + 1) * WHEEL_SLICE;
    return `${colorFor(mult)} ${a0}deg ${a1}deg`;
  });
  return `conic-gradient(from 0deg, ${parts.join(', ')})`;
}

function WheelGraphic({
  rotation,
  size,
  resultIndex,
  spinning,
  duration,
}: {
  rotation: number;
  size: number;
  resultIndex: number | null;
  spinning: boolean;
  duration: number;
}) {
  const radius = size * 0.38;
  const resultMult = resultIndex === null ? null : WHEEL_ORDER[resultIndex];

  return (
    <div className="wheel-wrap bandit-wheel" style={{ width: size, height: size }}>
      <div className="wheel-pointer" />
      <div className="wheel-rim" />
      <div
        className="wheel"
        style={{
          transform: `rotate(${rotation}deg)`,
          background: wheelGradient(),
          transition: spinning ? `transform ${duration}ms cubic-bezier(0.12, 0.72, 0.08, 1)` : 'none',
        }}
      >
        {WHEEL_ORDER.map((mult, i) => {
          const angle = i * WHEEL_SLICE + WHEEL_SLICE / 2;
          const rad = ((angle - 90) * Math.PI) / 180;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          const isWinner = !spinning && resultIndex === i;
          return (
            <span
              key={i}
              className={`wheel-seg ${isWinner ? 'winner' : ''}`}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              }}
            >
              {mult}×
            </span>
          );
        })}
        <div className="wheel-hub">{resultMult === null ? '·' : `${resultMult}×`}</div>
      </div>
    </div>
  );
}

export function RouletteTable({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, settleRound, consumeChallenge, state, setWagerMinutes } = useScreel();
  const [pick, setPick] = useState<number>(2);
  const [stage, setStage] = useState<Stage>('ready');
  const [rotation, setRotation] = useState(0);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);
  const [spinDuration, setSpinDuration] = useState(5200);
  const spinLock = useRef(false);
  const rotationRef = useRef(0);
  const stakeRef = useRef(0);

  const selectedStake = Math.min(state.wagerMinutes, remaining, earnLeftToday);
  const potentialWin = Math.round(selectedStake * (pick - 1));
  const busy = stage === 'spinning';

  const start = async () => {
    if (spinLock.current) return;
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
    spinLock.current = true;
    setBanner(null);
    setResultIndex(null);
    setStage('spinning');

    const index = spinIndex();
    const pocketAngle = index * WHEEL_SLICE + WHEEL_SLICE / 2;
    const target = mod360(-pocketAngle);
    const delta = spinDelta(rotationRef.current, target, 6);
    const nextRot = rotationRef.current + delta;
    rotationRef.current = nextRot;
    setRotation(nextRot);

    await sleep(spinDuration);

    const landed = WHEEL_ORDER[index];
    setResultIndex(index);
    setHistory((h) => [landed, ...h].slice(0, 12));
    setStage('done');

    if (landed === pick) {
      const applied = settleRound({
        game: 'roulette',
        pot: stake * (pick - 1),
        kept: true,
        wager: stake,
        detail: `Bet ${pick}× · landed ${landed}×`,
        result: 'win',
      });
      setBanner({
        text: applied > 0 ? `Landed ${landed}× · +${applied}m` : 'Win — daily winnings cap reached.',
        kind: 'win',
      });
    } else {
      settleRound({
        game: 'roulette',
        pot: 0,
        kept: false,
        wager: stake,
        detail: `Bet ${pick}× · landed ${landed}×`,
        result: 'lose',
      });
      setBanner({ text: `Landed ${landed}× · lost ${stake}m`, kind: 'lose' });
    }

    spinLock.current = false;
  };

  return (
    <div className="screen game-stage rl-screen">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={busy}>
          <ArrowLeft size={16} /> Play
        </button>
        <div className="bj-balance">
          <span>Minutes left</span>
          <strong>{remaining}m</strong>
        </div>
      </div>

      <PotTicker pot={potentialWin} earnLeft={earnLeftToday} wager={selectedStake} label="Potential win" />

      {(stage === 'ready' || stage === 'done') && (
        <WagerSelector
          value={state.wagerMinutes}
          remaining={remaining}
          limit={earnLeftToday}
          onChange={setWagerMinutes}
        />
      )}

      {(stage === 'ready' || stage === 'done') && (
        <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
          <div className="tier-row">
            {WHEEL_TIERS.map((tier) => (
              <button
                key={tier.mult}
                type="button"
                className={`tier-chip ${pick === tier.mult ? 'active' : ''}`}
                style={{ '--tier': tier.color } as React.CSSProperties}
                disabled={busy}
                onClick={() => setPick(tier.mult)}
              >
                <strong>{tier.label}</strong>
                <span>{Math.round(chanceFor(tier.mult))}%</span>
              </button>
            ))}
          </div>
          <div className="option-strip">
            <span className="hand-label">Spin</span>
            {[
              { label: 'Quick', ms: 3000 },
              { label: 'Cinematic', ms: 5200 },
            ].map((option) => (
              <button
                type="button"
                key={option.ms}
                className={spinDuration === option.ms ? 'active' : ''}
                onClick={() => setSpinDuration(option.ms)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`rl-live-stage ${busy ? 'active' : ''}`}>
        <div className="rl-live-status">
          {busy ? 'Spinning…' : `Betting on ${pick}×`}
        </div>
        <WheelGraphic
          rotation={rotation}
          size={busy ? 280 : 240}
          resultIndex={resultIndex}
          spinning={busy}
          duration={spinDuration}
        />
      </div>

      <div className="rl-history">
        <span className="hand-label">Last</span>
        <div className="rl-history-row">
          {history.length === 0 && <span className="mute">—</span>}
          {history.map((mult, i) => (
            <span
              key={`${mult}-${i}`}
              className="rl-hist"
              style={{ background: colorFor(mult) }}
            >
              {mult}×
            </span>
          ))}
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
        <button type="button" className="btn btn-primary btn-block" onClick={() => void start()} disabled={busy}>
          {busy ? 'Spinning…' : stage === 'done' ? 'Spin again' : `Spin for ${pick}×`}
        </button>
      </div>
    </div>
  );
}
