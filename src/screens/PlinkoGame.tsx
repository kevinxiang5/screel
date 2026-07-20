import { useEffect, useRef, useState } from 'react';
import { GameChrome } from '../components/GameChrome';
import { WagerSelector } from '../components/WagerSelector';
import { useScreel } from '../context/ScreelContext';
import { formatPlinkoMult, PLINKO_MODES, type PlinkoRisk } from '../utils/plinko';
import {
  binReturn,
  layoutPegs,
  multsForRisk,
  spawnBall,
  stepBall,
  type Peg,
  type PlinkoBallState,
} from '../utils/plinkoPhysics';

const MAX_BALLS = 10;

export function PlinkoGame({ onBack }: { onBack: () => void }) {
  const { remaining, state, setWagerMinutes, lockStake, resolveLock, forfeitAllLocks } = useScreel();
  const [risk, setRisk] = useState<PlinkoRisk>('medium');
  const [balls, setBalls] = useState<PlinkoBallState[]>([]);
  const [pegs, setPegs] = useState<Peg[]>([]);
  const [history, setHistory] = useState<{ mult: number; net: number }[]>([]);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' | 'push' } | null>(null);
  const [lastBin, setLastBin] = useState<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const ballsRef = useRef<PlinkoBallState[]>([]);
  const pegsRef = useRef<Peg[]>([]);
  const rafRef = useRef(0);
  const riskRef = useRef(risk);
  const resolveRef = useRef(resolveLock);
  const forfeitRef = useRef(forfeitAllLocks);
  resolveRef.current = resolveLock;
  forfeitRef.current = forfeitAllLocks;
  riskRef.current = risk;

  const mode = PLINKO_MODES[risk];
  const mults = mode.mults;

  useEffect(() => {
    const measure = () => {
      const board = boardRef.current;
      if (!board) return;
      const next = layoutPegs(board.clientWidth, board.clientHeight, mode.rows);
      pegsRef.current = next;
      setPegs(next);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (boardRef.current && ro) ro.observe(boardRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [mode.rows]);

  useEffect(() => {
    const tick = () => {
      const prev = ballsRef.current;
      if (prev.length === 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      let changed = false;
      const activeMults = multsForRisk(riskRef.current);
      const nextBalls = prev.map((ball) => {
        if (ball.settled) return ball;
        changed = true;
        return stepBall(ball);
      });

      for (let i = 0; i < nextBalls.length; i += 1) {
        const ball = nextBalls[i];
        if (!ball.settled || prev[i]?.settled || ball.bin == null) continue;
        const mult = activeMults[ball.bin] ?? 0;
        const credited = binReturn(ball.stake, mult);
        const net = resolveRef.current({
          lockId: ball.lockId,
          returnMinutes: credited,
          detail: `Landed ${formatPlinkoMult(mult)}`,
          result: credited > ball.stake ? 'win' : credited < ball.stake ? 'lose' : 'push',
        });
        setLastBin(ball.bin);
        setHistory((rows) => [{ mult, net }, ...rows].slice(0, 12));
        setBanner({
          text:
            net > 0
              ? `Landed ${formatPlinkoMult(mult)} · +${net}m`
              : net < 0
                ? `Landed ${formatPlinkoMult(mult)} · ${net}m`
                : `Landed ${formatPlinkoMult(mult)} · even`,
          kind: net > 0 ? 'win' : net < 0 ? 'lose' : 'push',
        });
        changed = true;
      }

      const live = nextBalls.filter((b) => !b.settled);
      const settledKeep = nextBalls.filter((b) => b.settled).slice(-4);
      const pruned = [...live, ...settledKeep];
      if (changed || pruned.length !== prev.length) {
        ballsRef.current = pruned;
        setBalls(pruned);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      forfeitRef.current();
    };
  }, []);

  const selectedStake = Math.min(state.wagerMinutes, remaining);
  const inFlight = balls.filter((b) => !b.settled).length;
  const locked = inFlight > 0;

  const drop = () => {
    const board = boardRef.current;
    if (!board) return;
    if (ballsRef.current.filter((b) => !b.settled).length >= MAX_BALLS) {
      setBanner({ text: `Max ${MAX_BALLS} balls in the air.`, kind: 'lose' });
      return;
    }
    const stakeLock = lockStake(state.wagerMinutes, 'plinko');
    if (!stakeLock) {
      setBanner({ text: 'No minutes available to stake.', kind: 'lose' });
      return;
    }
    const current = PLINKO_MODES[riskRef.current];
    if (pegsRef.current.length === 0) {
      pegsRef.current = layoutPegs(board.clientWidth, board.clientHeight, current.rows);
      setPegs(pegsRef.current);
    }
    const ball = spawnBall(
      board.clientWidth,
      board.clientHeight,
      current.rows,
      current.mults.length,
      stakeLock.amount,
      stakeLock.id,
    );
    const next = [...ballsRef.current, ball];
    ballsRef.current = next;
    setBalls(next);
    setBanner(null);
  };

  const dropMany = (count: number) => {
    for (let i = 0; i < count; i += 1) drop();
  };

  return (
    <GameChrome
      title="Plinko"
      onBack={onBack}
      banner={banner}
      setup={
        <>
          <WagerSelector
            value={state.wagerMinutes}
            remaining={remaining}
            onChange={setWagerMinutes}
            disabled={remaining < 1 || locked}
          />
          <div className={`option-strip ${locked ? 'locked' : ''}`} aria-label="Plinko risk">
            <span className="hand-label">Risk</span>
            {(Object.keys(PLINKO_MODES) as PlinkoRisk[]).map((key) => (
              <button
                type="button"
                key={key}
                className={risk === key ? 'active' : ''}
                disabled={locked}
                onClick={() => setRisk(key)}
              >
                {PLINKO_MODES[key].label}
              </button>
            ))}
          </div>
        </>
      }
      dock={
        <div className="bj-actions wrap">
          <button
            type="button"
            className="btn btn-primary"
            onClick={drop}
            disabled={remaining < 1 || inFlight >= MAX_BALLS}
          >
            Drop · {selectedStake}m
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => dropMany(3)}
            disabled={remaining < 1 || inFlight >= MAX_BALLS}
          >
            Drop 3
          </button>
        </div>
      }
    >
      <div className="plinko-meta">
        <span>
          {inFlight} in air · {mode.rows} rows · {mode.blurb}
        </span>
        <span>Stake locks on drop</span>
      </div>
      <div
        className="plinko-board"
        ref={boardRef}
        style={{ '--plinko-bins': mults.length } as React.CSSProperties}
      >
        {pegs.map((peg) => (
          <span
            key={`${peg.row}-${peg.index}`}
            className="plinko-peg"
            style={{ left: peg.x, top: peg.y }}
          />
        ))}
        {balls.map((ball) => (
          <div
            key={ball.id}
            className={`plinko-ball ${ball.settled ? 'settled' : ''}`}
            style={{ left: ball.x, top: ball.y }}
          />
        ))}
        <div className="plinko-bins">
          {mults.map((mult, i) => (
            <div
              key={i}
              className={`plinko-bin ${lastBin === i ? 'hit' : ''} ${mult >= 2 ? 'hot' : mult < 1 ? 'cold' : ''}`}
            >
              <strong>{formatPlinkoMult(mult).replace('×', '')}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="rl-history" style={{ marginTop: 8 }}>
        <span className="hand-label">Last</span>
        <div className="rl-history-row">
          {history.length === 0 && <span className="mute">—</span>}
          {history.map((h, i) => (
            <span
              key={`${h.mult}-${i}`}
              className={`rl-hist ${h.net > 0 ? 'green' : h.net < 0 ? 'red' : 'black'}`}
            >
              {formatPlinkoMult(h.mult).replace('×', '')}
            </span>
          ))}
        </div>
      </div>
    </GameChrome>
  );
}
