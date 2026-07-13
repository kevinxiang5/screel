import { useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { ChipTray, StackChip } from '../components/Chips';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';
import {
  CHIP_VALUES,
  TABLE_ROWS,
  WHEEL_ORDER,
  colorOf,
  payoutForBet,
  spotLabel,
  spinWheel,
  type SpotId,
  type SpinResult,
} from '../utils/roulette';

type Bets = Partial<Record<SpotId, number>>;
type Stage = 'table' | 'zooming' | 'live' | 'reveal' | 'outro';

const SLICE = 360 / WHEEL_ORDER.length;
const SPIN_MS = 7200;
const REVEAL_MS = 1800;
const OUTRO_MS = 700;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mod360(n: number) {
  return ((n % 360) + 360) % 360;
}

/** Shortest forward/back spin that lands on targetMod after `spins` full turns */
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
}: {
  rotation: number;
  ballRotation: number;
  size: number;
  resultNum: number | null;
  live?: boolean;
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
      <div className="wheel-ball-orbit" style={{ transform: `rotate(${ballRotation}deg)` }}>
        <div className="wheel-ball" />
      </div>
    </div>
  );
}

export function RouletteTable({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound, state } = useScreel();
  const { confirm, toast } = useScreelUI();
  const [chip, setChip] = useState(5);
  const [bets, setBets] = useState<Bets>({});
  const [frozenBets, setFrozenBets] = useState<Bets>({});
  const [lastBets, setLastBets] = useState<Bets>({});
  const [history, setHistory] = useState<number[]>([]);
  const [stage, setStage] = useState<Stage>('table');
  const [rotation, setRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const [resultNum, setResultNum] = useState<number | null>(null);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' | 'push' } | null>(null);
  const [undoStack, setUndoStack] = useState<Bets[]>([]);
  const [liveStatus, setLiveStatus] = useState('No more bets');
  const spinLock = useRef(false);
  const rotationRef = useRef(0);
  const ballRef = useRef(0);

  const locked = stage !== 'table';

  const totalBet = useMemo(
    () => Object.values(bets).reduce<number>((s, v) => s + (v ?? 0), 0),
    [bets],
  );
  const frozenTotal = useMemo(
    () => Object.values(frozenBets).reduce<number>((s, v) => s + (v ?? 0), 0),
    [frozenBets],
  );
  const displayBalance = Math.max(0, remaining - (locked ? frozenTotal : totalBet));

  const place = (spot: SpotId) => {
    if (locked) return;
    if (totalBet + chip > remaining) {
      toast(`Only ${Math.max(0, remaining - totalBet)}m free on the felt.`, {
        title: 'Bank limit',
        tone: 'warn',
      });
      return;
    }
    setUndoStack((u) => [...u, bets]);
    setBets((prev) => ({ ...prev, [spot]: (prev[spot] ?? 0) + chip }));
    setBanner(null);
  };

  const clear = () => {
    if (locked) return;
    setUndoStack((u) => [...u, bets]);
    setBets({});
  };

  const undo = () => {
    if (locked || undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((u) => u.slice(0, -1));
    setBets(prev);
  };

  const rebet = () => {
    if (locked) return;
    const sum = Object.values(lastBets).reduce<number>((s, v) => s + (v ?? 0), 0);
    if (sum < 1 || sum > remaining) return;
    setUndoStack((u) => [...u, bets]);
    setBets({ ...lastBets });
  };

  const settle = (result: SpinResult, placed: Bets, wager: number) => {
    let payout = 0;
    const winners: string[] = [];
    for (const [spot, amount] of Object.entries(placed) as [SpotId, number][]) {
      if (!amount) continue;
      const won = payoutForBet(amount, spot, result);
      if (won > 0) {
        payout += won;
        winners.push(`${spotLabel(spot)} +${won - amount}m`);
      }
    }

    const net = payout - wager;
    const kind: 'win' | 'lose' | 'push' = net > 0 ? 'win' : net < 0 ? 'lose' : 'push';
    const text =
      winners.length > 0
        ? `${result.number} ${colorOf(result.number).toUpperCase()} · ${net >= 0 ? '+' : ''}${net}m · ${winners.join(', ')}`
        : `${result.number} ${colorOf(result.number).toUpperCase()} · ${net}m · no hits`;

    setBanner({ text, kind });
    settleRound({
      game: 'roulette',
      wager,
      payout,
      result: kind === 'push' ? 'push' : kind,
      detail: text,
    });
  };

  const spin = async () => {
    if (locked || totalBet < 1 || totalBet > remaining || spinLock.current) return;
    if (state.riskAlerts && totalBet > remaining * 0.25) {
      const ok = await confirm({
        title: 'High roller risk',
        message: `This spin puts over 25% of your bank on the felt (${totalBet}m of ${remaining}m left). Spin anyway?`,
        confirmLabel: 'Spin anyway',
        cancelLabel: 'Pull chips',
        tone: 'warn',
      });
      if (!ok) return;
    }
    if (totalBet > remaining) {
      toast('Your table bets exceed what’s left in the bank.', { title: 'Over banked', tone: 'error' });
      return;
    }

    spinLock.current = true;
    const placed = { ...bets };
    const wager = totalBet;
    setFrozenBets(placed);
    setLastBets(placed);
    setBanner(null);
    setResultNum(null);
    setLiveStatus('No more bets');

    setStage('zooming');
    await sleep(480);
    setStage('live');
    setLiveStatus('Ball in play');

    const result = spinWheel();
    const index = WHEEL_ORDER.indexOf(result.number);
    // Pocket center angle on the wheel (0° = top, clockwise)
    const pocketAngle = index * SLICE + SLICE / 2;
    // Rotate wheel so that pocket sits under the fixed pointer at top
    const wheelTarget = mod360(-pocketAngle);
    // Ball sits at top of orbit when angle is 0° — same spot as the pointer
    const ballTarget = 0;

    const wheelDelta = spinDelta(rotationRef.current, wheelTarget, 8, 1);
    const ballDelta = spinDelta(ballRef.current, ballTarget, 11, -1);

    await sleep(50);

    const nextWheel = rotationRef.current + wheelDelta;
    const nextBall = ballRef.current + ballDelta;
    rotationRef.current = nextWheel;
    ballRef.current = nextBall;
    setRotation(nextWheel);
    setBallRotation(nextBall);

    const dropTimer = window.setTimeout(() => setLiveStatus('Ball dropping…'), Math.floor(SPIN_MS * 0.78));

    await sleep(SPIN_MS);
    window.clearTimeout(dropTimer);

    // Ball + winning pocket are both under the pointer now
    setResultNum(result.number);
    setLiveStatus(`${result.number} · ${colorOf(result.number).toUpperCase()}`);
    setHistory((h) => [result.number, ...h].slice(0, 14));
    setStage('reveal');
    settle(result, placed, wager);

    await sleep(REVEAL_MS);
    setStage('outro');
    setBets({});
    setFrozenBets({});
    setUndoStack([]);
    await sleep(OUTRO_MS);
    setStage('table');
    spinLock.current = false;
  };
  const Spot = ({
    id,
    className,
    children,
  }: {
    id: SpotId;
    className?: string;
    children: ReactNode;
  }) => {
    const showBets = locked ? frozenBets : bets;
    const hit =
      resultNum !== null &&
      (stage === 'reveal' || stage === 'outro' || stage === 'table') &&
      id === (`n-${resultNum}` as SpotId);
    return (
      <button
        type="button"
        className={`rl-spot ${className ?? ''} ${showBets[id] ? 'has-chip' : ''} ${hit ? 'hit' : ''}`}
        onClick={() => place(id)}
        disabled={locked}
      >
        {children}
        {showBets[id] ? <StackChip amount={showBets[id]!} /> : null}
      </button>
    );
  };

  const showLive = stage === 'zooming' || stage === 'live' || stage === 'reveal' || stage === 'outro';
  const wagerOnTable = locked ? frozenTotal : totalBet;

  return (
    <div className={`screen game-stage rl-screen ${showLive ? 'is-live' : ''}`}>
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={locked}>
          <ArrowLeft size={16} /> Floor
        </button>
        <div className="bj-balance">
          <span>Balance</span>
          <strong>{displayBalance}m</strong>
        </div>
      </div>

      <div className={`rl-table-view ${showLive ? 'dimmed' : ''}`}>
        <div className="rl-top">
          <WheelGraphic
            rotation={rotation}
            ballRotation={ballRotation}
            size={120}
            resultNum={resultNum}
          />
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
            <div className="rl-bet-total">
              On table <strong>{wagerOnTable}m</strong>
            </div>
          </div>
        </div>

        <div className="rl-table-wrap">
          <div className="rl-table">
            <Spot id="n-0" className="rl-zero">
              0
            </Spot>

            <div className="rl-numbers">
              {TABLE_ROWS.map((row, ri) => (
                <div className="rl-row" key={ri}>
                  {row.map((n) => (
                    <Spot key={n} id={`n-${n}` as SpotId} className={`rl-num ${colorOf(n)}`}>
                      {n}
                    </Spot>
                  ))}
                  <Spot id={`col-${(3 - ri) as 1 | 2 | 3}` as SpotId} className="rl-col">
                    2:1
                  </Spot>
                </div>
              ))}
            </div>

            <div className="rl-dozens">
              <Spot id="dozen-1" className="rl-out">
                1st 12
              </Spot>
              <Spot id="dozen-2" className="rl-out">
                2nd 12
              </Spot>
              <Spot id="dozen-3" className="rl-out">
                3rd 12
              </Spot>
            </div>

            <div className="rl-outside">
              <Spot id="low" className="rl-out">
                1–18
              </Spot>
              <Spot id="even" className="rl-out">
                EVEN
              </Spot>
              <Spot id="red" className="rl-out red">
                RED
              </Spot>
              <Spot id="black" className="rl-out black">
                BLACK
              </Spot>
              <Spot id="odd" className="rl-out">
                ODD
              </Spot>
              <Spot id="high" className="rl-out">
                19–36
              </Spot>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {banner && stage === 'table' && (
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
      </div>

      <AnimatePresence>
        {showLive && (
          <motion.div
            className="rl-live-stage"
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{
              opacity: stage === 'outro' ? 0 : 1,
              scale: stage === 'zooming' ? 0.86 : stage === 'outro' ? 1.08 : 1,
            }}
            exit={{ opacity: 0, scale: 1.12 }}
            transition={{ duration: stage === 'zooming' ? 0.45 : 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="rl-live-glow" />
            <div className="rl-live-badge">
              <span className="rl-live-dot" />
              LIVE SPIN
            </div>

            <motion.div
              className="rl-live-status"
              key={liveStatus}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {liveStatus}
            </motion.div>

            <div className="rl-live-wheel-frame">
              <WheelGraphic
                rotation={rotation}
                ballRotation={ballRotation}
                size={280}
                resultNum={resultNum}
                live
              />
            </div>

            {stage === 'reveal' && resultNum !== null && (
              <motion.div
                className={`rl-live-callout ${colorOf(resultNum)} final`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                {resultNum}
              </motion.div>
            )}

            <div className="rl-live-meta">
              <span>{wagerOnTable}m on the felt</span>
              {stage === 'reveal' && banner && (
                <motion.strong
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={banner.kind}
                >
                  {banner.text}
                </motion.strong>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`bj-dock rl-dock ${locked ? 'locked' : ''}`}>
        <ChipTray
          selected={chip}
          onSelect={setChip}
          disabled={locked || remaining < 1}
          values={[...CHIP_VALUES].filter((v) => v <= Math.max(1, remaining))}
        />
        <p className="rl-hint">
          {locked ? 'Watch the wheel — result locks when the ball drops.' : 'Select a chip, tap spots, then Spin for a live roll.'}
        </p>
        <div className="bj-actions wrap">
          <button type="button" className="btn btn-secondary" onClick={undo} disabled={locked || undoStack.length === 0}>
            Undo
          </button>
          <button type="button" className="btn btn-secondary" onClick={clear} disabled={locked || totalBet < 1}>
            Clear
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={rebet}
            disabled={locked || Object.keys(lastBets).length === 0}
          >
            Rebet
          </button>
          <button type="button" className="btn btn-danger" onClick={spin} disabled={locked || totalBet < 1}>
            {locked ? 'Rolling…' : `Spin · ${totalBet}m`}
          </button>
        </div>
      </div>
    </div>
  );
}
