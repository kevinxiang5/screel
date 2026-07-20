import { useEffect, useRef, useState } from 'react';
import { GameChrome } from '../components/GameChrome';
import { WagerSelector } from '../components/WagerSelector';
import { useScreel } from '../context/ScreelContext';
import { PLINKO_MULTS, PLINKO_ROWS } from '../utils/plinko';
import {
  binReturn,
  layoutPegs,
  spawnBall,
  stepBall,
  type Peg,
  type PlinkoBallState,
} from '../utils/plinkoPhysics';

const MAX_BALLS = 10;

export function PlinkoGame({ onBack }: { onBack: () => void }) {
  const { remaining, state, setWagerMinutes, lockStake, resolveLock, forfeitAllLocks } = useScreel();
  const [balls, setBalls] = useState<PlinkoBallState[]>([]);
  const [pegs, setPegs] = useState<Peg[]>([]);
  const [history, setHistory] = useState<{ mult: number; net: number }[]>([]);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' | 'push' } | null>(null);
  const [lastBin, setLastBin] = useState<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const ballsRef = useRef<PlinkoBallState[]>([]);
  const pegsRef = useRef<Peg[]>([]);
  const rafRef = useRef(0);
  const resolveRef = useRef(resolveLock);
  const forfeitRef = useRef(forfeitAllLocks);
  resolveRef.current = resolveLock;
  forfeitRef.current = forfeitAllLocks;

  useEffect(() => {
    const measure = () => {
      const board = boardRef.current;
      if (!board) return;
      const next = layoutPegs(board.clientWidth, board.clientHeight);
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
  }, []);

  useEffect(() => {
    const tick = () => {
      const board = boardRef.current;
      if (!board) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const w = board.clientWidth;
      const h = board.clientHeight;
      let changed = false;
      const prev = ballsRef.current;
      const nextBalls = prev.map((ball) => {
        if (ball.settled) return ball;
        changed = true;
        return stepBall(ball, pegsRef.current, w, h);
      });

      for (let i = 0; i < nextBalls.length; i += 1) {
        const ball = nextBalls[i];
        if (!ball.settled || prev[i]?.settled || ball.bin == null) continue;
        const credited = binReturn(ball.stake, ball.bin);
        const net = resolveRef.current({
          lockId: ball.lockId,
          returnMinutes: credited,
          detail: `Landed ${PLINKO_MULTS[ball.bin]}×`,
          result: credited > ball.stake ? 'win' : credited < ball.stake ? 'lose' : 'push',
        });
        setLastBin(ball.bin);
        setHistory((rows) => [{ mult: PLINKO_MULTS[ball.bin!], net }, ...rows].slice(0, 12));
        setBanner({
          text:
            net > 0
              ? `Landed ${PLINKO_MULTS[ball.bin]}× · +${net}m`
              : net < 0
                ? `Landed ${PLINKO_MULTS[ball.bin]}× · ${net}m`
                : `Landed ${PLINKO_MULTS[ball.bin]}× · even`,
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

  const drop = () => {
    const board = boardRef.current;
    if (!board) return;
    if (ballsRef.current.filter((b) => !b.settled).length >= MAX_BALLS) {
      setBanner({ text: `Max ${MAX_BALLS} balls in the air.`, kind: 'lose' });
      return;
    }
    const locked = lockStake(state.wagerMinutes, 'plinko');
    if (!locked) {
      setBanner({ text: 'No minutes available to stake.', kind: 'lose' });
      return;
    }
    if (pegsRef.current.length === 0) {
      pegsRef.current = layoutPegs(board.clientWidth, board.clientHeight);
      setPegs(pegsRef.current);
    }
    const ball = spawnBall(board.clientWidth, locked.amount, locked.id);
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
        <WagerSelector
          value={state.wagerMinutes}
          remaining={remaining}
          onChange={setWagerMinutes}
          disabled={remaining < 1}
        />
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
          {inFlight} in air · {PLINKO_ROWS} rows
        </span>
        <span>Stake locks on drop</span>
      </div>
      <div className="plinko-board" ref={boardRef}>
        {pegs.map((peg) => (
          <span
            key={`${peg.row}-${peg.index}`}
            className="plinko-peg"
            style={{ left: peg.x, top: peg.y }}
          />
        ))}
        {balls.map((ball) => (
          <div key={ball.id}>
            {ball.trail.map((p, i) => (
              <span
                key={`${ball.id}-t${i}`}
                className="plinko-trail"
                style={{
                  left: p.x,
                  top: p.y,
                  opacity: ((i + 1) / (ball.trail.length + 1)) * 0.55,
                }}
              />
            ))}
            <div
              className={`plinko-ball ${ball.settled ? 'settled' : ''}`}
              style={{ left: ball.x, top: ball.y }}
            />
          </div>
        ))}
        <div className="plinko-bins">
          {PLINKO_MULTS.map((mult, i) => (
            <div
              key={i}
              className={`plinko-bin ${lastBin === i ? 'hit' : ''} ${mult >= 2 ? 'hot' : mult < 1 ? 'cold' : ''}`}
            >
              <strong>{mult}×</strong>
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
              {h.mult}×
            </span>
          ))}
        </div>
      </div>
    </GameChrome>
  );
}
