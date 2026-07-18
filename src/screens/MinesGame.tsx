import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Bomb, Gem } from 'lucide-react';
import { WagerSelector } from '../components/WagerSelector';
import { useScreel } from '../context/ScreelContext';
import { minesPot, seedPot } from '../utils/potMath';

const GRID = 25;

type Stage = 'ready' | 'live' | 'done';

function pickMines(count: number): Set<number> {
  const spots = new Set<number>();
  while (spots.size < count) spots.add(Math.floor(Math.random() * GRID));
  return spots;
}

export function MinesGame({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound, state, setWagerMinutes } = useScreel();
  const [stage, setStage] = useState<Stage>('ready');
  const [hazardCount, setHazardCount] = useState(5);
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [base, setBase] = useState(0);
  const [stake, setStake] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const riskBase = (base || seedPot('mines', Math.min(state.wagerMinutes, remaining))) * (hazardCount / 5);
  const pot = minesPot(riskBase, revealed.size);

  const start = () => {
    if (remaining < 1) {
      setBanner({ text: 'No minutes available to stake.', kind: 'lose' });
      return;
    }
    const nextStake = Math.min(state.wagerMinutes, remaining);
    setStake(nextStake);
    setBase(seedPot('mines', nextStake));
    setMines(pickMines(hazardCount));
    setRevealed(new Set());
    setBanner(null);
    setStage('live');
  };

  const bankIt = () => {
    if (stage !== 'live' || revealed.size === 0) return;
    const amount = Math.round(minesPot(base * (hazardCount / 5), revealed.size));
    const applied = settleRound({
      game: 'mines',
      pot: amount,
      kept: true,
      wager: stake,
      detail: `Banked after ${revealed.size} safe tiles`,
      result: 'win',
    });
    setStage('done');
    setBanner({ text: `Won +${applied}m`, kind: 'win' });
  };

  const reveal = (i: number) => {
    if (stage !== 'live' || revealed.has(i)) return;
    if (mines.has(i)) {
      setStage('done');
      settleRound({
        game: 'mines',
        pot: 0,
        kept: false,
        wager: stake,
        detail: `Hazard after ${revealed.size} safe · ${hazardCount} hazard board`,
        result: 'lose',
      });
      setBanner({ text: `Hazard! Lost ${stake}m.`, kind: 'lose' });
      return;
    }
    const next = new Set(revealed);
    next.add(i);
    setRevealed(next);
  };

  return (
    <div className="screen game-stage">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={stage === 'live'}>
          <ArrowLeft size={16} /> Play
        </button>
        <div className="bj-balance">
          <span>Minutes left</span>
          <strong>{remaining}m</strong>
        </div>
      </div>

      {(stage === 'ready' || stage === 'done') && (
        <WagerSelector value={state.wagerMinutes} remaining={remaining} onChange={setWagerMinutes} />
      )}

      <p className="lede" style={{ marginTop: 0 }}>
        This board has <strong>{hazardCount} hazards</strong> hidden in {GRID} tiles. Reveal safe tiles to grow
        the payout. Bank anytime — hit a hazard and you lose your stake.
      </p>

      {(stage === 'ready' || stage === 'done') && (
        <div className="option-strip" aria-label="Safe tiles difficulty">
          <span className="hand-label">Hazards</span>
          {[3, 5, 7].map((count) => (
            <button
              type="button"
              key={count}
              className={hazardCount === count ? 'active' : ''}
              onClick={() => setHazardCount(count)}
            >
              {count} · {count === 3 ? 'Calm' : count === 5 ? 'Focused' : 'Intense'}
            </button>
          ))}
        </div>
      )}

      <div className={`mines-grid ${stage === 'done' ? 'over' : ''}`}>
        {Array.from({ length: GRID }, (_, i) => {
          const isMine = mines.has(i);
          const isOpen = revealed.has(i);
          const showMine = stage === 'done' && isMine;
          const nearMiss = stage === 'done' && !isMine && !isOpen;
          return (
            <button
              key={i}
              type="button"
              className={`mine-tile ${isOpen ? 'safe' : ''} ${showMine ? 'boom' : ''} ${nearMiss ? 'near' : ''}`}
              onClick={() => reveal(i)}
              disabled={stage !== 'live' || isOpen}
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
          >
            {banner.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bj-dock">
        <div className="grid-2" style={{ marginBottom: 10, gap: 10 }}>
          <div className="stat-tile">
            <div className="label">Hazards</div>
            <div className="value">{hazardCount}</div>
          </div>
          <div className="stat-tile">
            <div className="label">Safe found</div>
            <div className="value">{revealed.size}</div>
          </div>
        </div>
        {stage === 'live' && (
          <div className="bj-actions">
            <button
              type="button"
              className="btn btn-gold"
              onClick={bankIt}
              disabled={revealed.size === 0}
            >
              Bank it ({Math.round(pot)}m)
            </button>
          </div>
        )}
        {(stage === 'ready' || stage === 'done') && (
          <button type="button" className="btn btn-primary btn-block" onClick={start}>
            {stage === 'done' ? 'New board' : 'Start challenge'}
          </button>
        )}
      </div>
    </div>
  );
}
