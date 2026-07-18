import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { PotTicker } from '../components/PotTicker';
import { WagerSelector } from '../components/WagerSelector';
import { useScreel } from '../context/ScreelContext';
import { seedPot, spinPot } from '../utils/potMath';
import { WHEEL_ORDER, colorOf, spinWheel, type SpinResult } from '../utils/roulette';

type Pick = 'red' | 'black' | 'green';
type Stage = 'ready' | 'zooming' | 'live' | 'reveal' | 'choice' | 'done';

const SLICE = 360 / WHEEL_ORDER.length;
const MAX_DOUBLES = 2;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mod360(n: number) {
  return ((n % 360) + 360) % 360;
}

function spinDelta(current: number, targetMod: number, spins: number, dir: 1 | -1) {
  const cur = mod360(current);
  const target = mod360(targetMod);
  if (dir === 1) {
    let d = mod360(target - cur);
    if (d === 0) d = 360;
    return d + 360 * spins;
  }
  let d = mod360(cur - target);
  if (d === 0) d = 360;
  return -(d + 360 * spins);
}

function wheelGradient() {
  const parts = WHEEL_ORDER.map((n, i) => {
    const c = colorOf(n) === 'red' ? '#c81e1e' : colorOf(n) === 'green' ? '#0f8a3c' : '#141414';
    const a0 = i * SLICE;
    const a1 = (i + 1) * SLICE;
    return `${c} ${a0}deg ${a1}deg`;
  });
  return `conic-gradient(from 0deg, ${parts.join(', ')})`;
}

function WheelGraphic({
  rotation,
  ballRotation,
  size,
  resultNum,
  live,
  duration,
}: {
  rotation: number;
  ballRotation: number;
  size: number;
  resultNum: number | null;
  live?: boolean;
  duration: number;
}) {
  const radius = size * (live ? 0.405 : 0.39);

  return (
    <div className={`wheel-wrap live-wheel ${live ? 'live' : ''}`} style={{ width: size, height: size }}>
      <div className="wheel-pointer" />
      <div className="wheel-rim" />
      <div
        className="wheel"
        style={{
          transform: `rotate(${rotation}deg)`,
          background: wheelGradient(),
          transition: live ? `transform ${duration}ms cubic-bezier(0.12, 0.7, 0.1, 1)` : undefined,
        }}
      >
        {WHEEL_ORDER.map((n, i) => {
          const angle = i * SLICE + SLICE / 2;
          const rad = ((angle - 90) * Math.PI) / 180;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;
          const isWinner = resultNum === n;
          return (
            <span
              key={n}
              className={`wheel-num ${isWinner ? 'winner' : ''}`}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: `translate(-50%, -50%) rotate(${angle}deg)`,
              }}
            >
              {n}
            </span>
          );
        })}
        <div className="wheel-hub">{resultNum === null ? '·' : resultNum}</div>
      </div>
      <div
        className="wheel-ball-orbit"
        style={{
          transform: `rotate(${ballRotation}deg)`,
          transition: live ? `transform ${duration}ms cubic-bezier(0.08, 0.65, 0.12, 1)` : undefined,
        }}
      >
        <div className="wheel-ball" />
      </div>
    </div>
  );
}

export function RouletteTable({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, settleRound, consumeChallenge, state, setWagerMinutes } = useScreel();
  const [pick, setPick] = useState<Pick>('red');
  const [stage, setStage] = useState<Stage>('ready');
  const [rotation, setRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const [resultNum, setResultNum] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [base, setBase] = useState(0);
  const [doubles, setDoubles] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);
  const [liveStatus, setLiveStatus] = useState('Pick a color');
  const [spinDuration, setSpinDuration] = useState(7200);
  const spinLock = useRef(false);
  const rotationRef = useRef(0);
  const ballRef = useRef(0);
  const baseRef = useRef(0);
  const stakeRef = useRef(0);
  const doublesRef = useRef(0);

  const pickFactor = pick === 'green' ? 8 : 1;
  const pot = spinPot(
    base || seedPot('roulette', Math.min(state.wagerMinutes, remaining, earnLeftToday)) * pickFactor,
    doubles,
  );
  const busy = stage === 'zooming' || stage === 'live' || stage === 'reveal';

  const missRound = (spun: SpinResult) => {
    settleRound({
      game: 'roulette',
      pot: 0,
      kept: false,
      wager: stakeRef.current,
      detail: `Picked ${pick}, landed ${spun.number} (${colorOf(spun.number)})`,
      result: 'lose',
    });
    setBanner({
      text: `${spun.number} ${colorOf(spun.number)} · lost ${stakeRef.current}m`,
      kind: 'lose',
    });
    setStage('done');
  };

  const runSpin = async () => {
    if (spinLock.current) return;
    spinLock.current = true;
    setBanner(null);
    setResultNum(null);
    setLiveStatus('No more picks');
    setStage('zooming');
    await sleep(420);
    setStage('live');
    setLiveStatus('Ball in play');

    const spun = spinWheel();
    const index = WHEEL_ORDER.indexOf(spun.number);
    const pocketAngle = index * SLICE + SLICE / 2;
    const wheelTarget = mod360(-pocketAngle);
    const wheelDelta = spinDelta(rotationRef.current, wheelTarget, 8, 1);
    const ballDelta = spinDelta(ballRef.current, 0, 11, -1);

    const nextRot = rotationRef.current + wheelDelta;
    const nextBall = ballRef.current + ballDelta;
    rotationRef.current = nextRot;
    ballRef.current = nextBall;
    // Force layout then apply — CSS transition handles the spin
    setRotation(nextRot);
    setBallRotation(nextBall);

    await sleep(spinDuration);
    setResultNum(spun.number);
    setHistory((h) => [spun.number, ...h].slice(0, 12));
    setLiveStatus(`${spun.number} ${colorOf(spun.number)}`);
    setStage('reveal');
    await sleep(900);

    const landed = colorOf(spun.number);
    if (landed !== pick) {
      missRound(spun);
      spinLock.current = false;
      return;
    }

    if (doublesRef.current >= MAX_DOUBLES) {
      const amount = Math.round(spinPot(baseRef.current, doublesRef.current));
      const applied = settleRound({
        game: 'roulette',
        pot: amount,
        kept: true,
        wager: stakeRef.current,
        detail: `Matched ${pick} · max double banked`,
        result: 'win',
      });
      setBanner({
        text: applied > 0 ? `Max double · +${applied}m` : 'Matched — daily winnings cap reached.',
        kind: 'win',
      });
      setStage('done');
    } else {
      setStage('choice');
      setBanner({
        text: `${spun.number} ${landed}! Bank or spin again to double.`,
        kind: 'win',
      });
    }
    spinLock.current = false;
  };

  const start = () => {
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
    const b = seedPot('roulette', stake) * pickFactor;
    setBase(b);
    baseRef.current = b;
    setDoubles(0);
    doublesRef.current = 0;
    void runSpin();
  };

  const bankIt = () => {
    const amount = Math.round(spinPot(baseRef.current, doublesRef.current));
    const applied = settleRound({
      game: 'roulette',
      pot: amount,
      kept: true,
      wager: stakeRef.current,
      detail: `Banked after ${doublesRef.current} doubles`,
      result: 'win',
    });
    setBanner({
      text: applied > 0 ? `Won +${applied}m` : 'Win recorded — daily winnings cap reached.',
      kind: 'win',
    });
    setStage('done');
  };

  const doubleAgain = () => {
    doublesRef.current += 1;
    setDoubles(doublesRef.current);
    void runSpin();
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

      <PotTicker
        pot={pot}
        earnLeft={earnLeftToday}
        wager={stakeRef.current || Math.min(state.wagerMinutes, remaining, earnLeftToday)}
      />

      {(stage === 'ready' || stage === 'done') && (
        <WagerSelector value={state.wagerMinutes} remaining={remaining} limit={earnLeftToday} onChange={setWagerMinutes} />
      )}

      {(stage === 'ready' || stage === 'done') && (
        <div style={{ display: 'grid', gap: 10, marginBottom: 12 }}>
          <div className="pick-row">
            {(['red', 'black', 'green'] as Pick[]).map((c) => (
              <button
                key={c}
                type="button"
                className={`btn ${pick === c ? 'btn-primary' : 'btn-secondary'} pick-${c}`}
                disabled={busy}
                onClick={() => setPick(c)}
              >
                {c}{c === 'green' ? ' · 8×' : ''}
              </button>
            ))}
          </div>
          <div className="option-strip">
            <span className="hand-label">Animation</span>
            {[{ label: 'Quick', ms: 3600 }, { label: 'Cinematic', ms: 7200 }].map((option) => (
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

      <div className={`rl-live-stage ${stage === 'live' || stage === 'zooming' ? 'active' : ''}`}>
        <div className="rl-live-status">{liveStatus}</div>
        <WheelGraphic
          rotation={rotation}
          ballRotation={ballRotation}
          size={stage === 'live' || stage === 'zooming' || stage === 'reveal' ? 280 : 220}
          resultNum={resultNum}
          live={stage === 'live'}
          duration={spinDuration}
        />
      </div>

      <div className="rl-history">
        <span className="hand-label">Last</span>
        <div className="rl-history-row">
          {history.length === 0 && <span className="mute">—</span>}
          {history.map((n, i) => (
            <span key={`${n}-${i}`} className={`rl-hist ${colorOf(n)}`}>
              {n}
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
        {(stage === 'ready' || stage === 'done') && (
          <button type="button" className="btn btn-primary btn-block" onClick={start} disabled={busy}>
            {stage === 'done' ? 'Spin again' : 'Spin'}
          </button>
        )}
        {stage === 'choice' && (
          <div className="bj-actions">
            <button type="button" className="btn btn-gold" onClick={bankIt}>
              Bank it ({Math.round(pot)}m)
            </button>
            <button type="button" className="btn btn-primary" onClick={doubleAgain}>
              Double again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
