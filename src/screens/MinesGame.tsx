import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Bomb, Gem } from 'lucide-react';
import { WagerBar } from '../components/WagerBar';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';

const GRID = 25;
const HOUSE = 0.97;

type Stage = 'idle' | 'live' | 'bust' | 'cashed';

function pickMines(count: number): Set<number> {
  const spots = new Set<number>();
  while (spots.size < count) spots.add(Math.floor(Math.random() * GRID));
  return spots;
}

/** Fair multiplier for `picks` safe reveals with `mines` bombs, minus house edge. */
function multiplierFor(picks: number, mines: number): number {
  let m = 1;
  for (let i = 0; i < picks; i += 1) {
    m *= (GRID - i) / (GRID - mines - i);
  }
  return m * HOUSE;
}

export function MinesGame({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound } = useScreel();
  const { toast } = useScreelUI();
  const [mineCount, setMineCount] = useState(5);
  const [wager, setWager] = useState(0);
  const [stage, setStage] = useState<Stage>('idle');
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const live = stage === 'live';
  const over = stage === 'bust' || stage === 'cashed';
  const safePicks = revealed.size;
  const mult = useMemo(
    () => (safePicks === 0 ? 1 : multiplierFor(safePicks, mineCount)),
    [safePicks, mineCount],
  );
  const cashValue = Math.floor(wager * mult);
  const nextMult = multiplierFor(safePicks + 1, mineCount);

  const start = () => {
    if (wager < 1 || wager > remaining) {
      toast('Set a wager within your bank first.', { title: 'No chips down', tone: 'warn' });
      return;
    }
    setMines(pickMines(mineCount));
    setRevealed(new Set());
    setBanner(null);
    setStage('live');
  };

  const reset = () => {
    setStage('idle');
    setRevealed(new Set());
    setMines(new Set());
  };

  const reveal = (i: number) => {
    if (!live || revealed.has(i)) return;
    if (mines.has(i)) {
      setStage('bust');
      setBanner({ text: `Boom. −${wager}m on ${safePicks} safe picks.`, kind: 'lose' });
      settleRound({
        game: 'mines',
        wager,
        payout: 0,
        result: 'lose',
        detail: `Hit a mine after ${safePicks} picks (${mineCount} mines)`,
      });
      return;
    }
    const next = new Set(revealed);
    next.add(i);
    setRevealed(next);
    // Board cleared of every safe tile — force the cashout.
    if (next.size >= GRID - mineCount) {
      const payout = Math.floor(wager * multiplierFor(next.size, mineCount));
      setStage('cashed');
      setBanner({ text: `Full clear! +${payout - wager}m`, kind: 'win' });
      settleRound({
        game: 'mines',
        wager,
        payout,
        result: 'win',
        detail: `Cleared the board (${mineCount} mines) ×${multiplierFor(next.size, mineCount).toFixed(2)}`,
      });
    }
  };

  const cashOut = () => {
    if (!live || safePicks === 0) return;
    setStage('cashed');
    setBanner({ text: `Cashed ${cashValue}m (+${cashValue - wager}m)`, kind: 'win' });
    settleRound({
      game: 'mines',
      wager,
      payout: cashValue,
      result: 'win',
      detail: `Cashed out ×${mult.toFixed(2)} after ${safePicks} picks (${mineCount} mines)`,
    });
  };

  return (
    <div className="screen game-stage">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={live}>
          <ArrowLeft size={16} /> Floor
        </button>
        <div className="bj-balance">
          <span>Balance</span>
          <strong>{Math.max(0, remaining - (live ? wager : 0))}m</strong>
        </div>
      </div>

      <div className="mines-meta">
        <div className="stat-tile">
          <div className="label">Multiplier</div>
          <div className="value">×{mult.toFixed(2)}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Next pick</div>
          <div className="value">×{nextMult.toFixed(2)}</div>
        </div>
      </div>

      <div className={`mines-grid ${over ? 'over' : ''}`}>
        {Array.from({ length: GRID }, (_, i) => {
          const isMine = mines.has(i);
          const isOpen = revealed.has(i);
          const showMine = over && isMine;
          return (
            <button
              key={i}
              type="button"
              className={`mine-tile ${isOpen ? 'safe' : ''} ${showMine ? 'boom' : ''}`}
              onClick={() => reveal(i)}
              disabled={!live || isOpen}
            >
              {isOpen ? <Gem size={20} /> : showMine ? <Bomb size={20} /> : ''}
            </button>
          );
        })}
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
        {!live && (
          <>
            <div className="mines-count-row">
              <span className="hand-label">Mines</span>
              {[3, 5, 7, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`btn btn-sm ${mineCount === n ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setMineCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <WagerBar wager={wager} onChange={setWager} max={remaining} />
            <button type="button" className="btn btn-primary btn-block" onClick={start} disabled={wager < 1}>
              Drop in · {wager}m
            </button>
          </>
        )}
        {live && (
          <button
            type="button"
            className="btn btn-gold btn-block"
            onClick={cashOut}
            disabled={safePicks === 0}
          >
            {safePicks === 0 ? 'Pick a tile…' : `Cash out ${cashValue}m`}
          </button>
        )}
        {over && (
          <button type="button" className="btn btn-primary btn-block" onClick={reset}>
            New board
          </button>
        )}
      </div>
    </div>
  );
}
