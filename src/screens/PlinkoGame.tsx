import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GameChrome } from '../components/GameChrome';
import { WagerSelector } from '../components/WagerSelector';
import { useScreel } from '../context/ScreelContext';
import { plinkoNet } from '../utils/potMath';
import { PLINKO_MULTS, PLINKO_ROWS, dropPlinko, plinkoChance } from '../utils/plinko';

type Stage = 'ready' | 'dropping' | 'done';

const PEG_ROWS = Array.from({ length: PLINKO_ROWS }, (_, row) =>
  Array.from({ length: row + 1 }, (_, i) => ({ row, i })),
);

export function PlinkoGame({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound, state, setWagerMinutes } = useScreel();
  const [stage, setStage] = useState<Stage>('ready');
  const [ball, setBall] = useState<{ x: number; y: number } | null>(null);
  const [landed, setLanded] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const animRef = useRef(0);

  useEffect(() => () => cancelAnimationFrame(animRef.current), []);

  const selectedStake = Math.min(state.wagerMinutes, remaining);
  const busy = stage === 'dropping';

  const drop = () => {
    if (busy) return;
    if (remaining < 1) {
      setBanner({ text: 'No minutes available to stake.', kind: 'lose' });
      return;
    }
    const stake = Math.min(state.wagerMinutes, remaining);
    const { bin, path } = dropPlinko();
    const board = boardRef.current;
    if (!board) return;

    const width = board.clientWidth;
    const height = board.clientHeight;
    const rowH = height / (PLINKO_ROWS + 1.6);
    const points = path.map((pos, row) => {
      const slots = row + 1;
      const gap = width / (slots + 1);
      return { x: gap * (pos + 1), y: rowH * (row + 0.35) };
    });
    // Final bin center
    const binGap = width / (PLINKO_MULTS.length + 1);
    points.push({ x: binGap * (bin + 1), y: height - 28 });

    setBanner(null);
    setLanded(null);
    setStage('dropping');
    setBall(points[0]);

    const start = performance.now();
    const duration = 2200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 2.4);
      const scaled = eased * (points.length - 1);
      const i = Math.min(points.length - 2, Math.floor(scaled));
      const local = scaled - i;
      const a = points[i];
      const b = points[i + 1];
      // Slight horizontal wobble between pegs
      const wobble = Math.sin(local * Math.PI) * 6 * (i % 2 === 0 ? 1 : -1);
      setBall({
        x: a.x + (b.x - a.x) * local + wobble * (1 - local) * local * 4,
        y: a.y + (b.y - a.y) * local,
      });
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
        return;
      }
      setBall(points[points.length - 1]);
      setLanded(bin);
      setHistory((h) => [bin, ...h].slice(0, 10));
      const mult = PLINKO_MULTS[bin];
      const net = plinkoNet(stake, mult);
      if (net >= 0) {
        const applied = settleRound({
          game: 'plinko',
          pot: net,
          kept: true,
          wager: stake,
          detail: `Landed ${mult}×`,
          result: 'win',
        });
        setBanner({
          text: net === 0 ? `Landed ${mult}× · even` : `Landed ${mult}× · +${applied}m`,
          kind: 'win',
        });
      } else {
        const loss = Math.min(stake, Math.abs(net));
        settleRound({
          game: 'plinko',
          pot: 0,
          kept: false,
          wager: loss,
          detail: `Landed ${mult}×`,
          result: 'lose',
        });
        setBanner({ text: `Landed ${mult}× · lost ${loss}m`, kind: 'lose' });
      }
      setStage('done');
    };
    animRef.current = requestAnimationFrame(tick);
  };

  return (
    <GameChrome
      title="Plinko"
      onBack={onBack}
      backDisabled={busy}
      banner={banner}
      setup={
        <WagerSelector
          value={state.wagerMinutes}
          remaining={remaining}
          onChange={setWagerMinutes}
          disabled={busy}
        />
      }
      dock={
        <button type="button" className="btn btn-primary btn-block" onClick={drop} disabled={busy}>
          {busy ? 'Dropping…' : stage === 'done' ? 'Drop again' : `Drop · ${selectedStake}m stake`}
        </button>
      }
    >
      <div className="plinko-board" ref={boardRef}>
        <div className="plinko-pegs">
          {PEG_ROWS.map((row, ri) => (
            <div key={ri} className="plinko-peg-row" style={{ top: `${((ri + 0.35) / (PLINKO_ROWS + 1.6)) * 100}%` }}>
              {row.map((peg) => (
                <span key={`${peg.row}-${peg.i}`} className="plinko-peg" />
              ))}
            </div>
          ))}
        </div>
        {ball && (
          <motion.div
            className="plinko-ball"
            style={{ left: ball.x, top: ball.y }}
            initial={false}
          />
        )}
        <div className="plinko-bins">
          {PLINKO_MULTS.map((mult, i) => (
            <div
              key={i}
              className={`plinko-bin ${landed === i ? 'hit' : ''} ${mult >= 2 ? 'hot' : mult < 1 ? 'cold' : ''}`}
            >
              <strong>{mult}×</strong>
              <span>{Math.round(plinkoChance(i))}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rl-history" style={{ marginTop: 12 }}>
        <span className="hand-label">Last</span>
        <div className="rl-history-row">
          {history.length === 0 && <span className="mute">—</span>}
          {history.map((bin, i) => (
            <span key={`${bin}-${i}`} className={`rl-hist ${PLINKO_MULTS[bin] >= 2 ? 'green' : PLINKO_MULTS[bin] < 1 ? 'red' : 'black'}`}>
              {PLINKO_MULTS[bin]}×
            </span>
          ))}
        </div>
      </div>
    </GameChrome>
  );
}
