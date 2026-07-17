import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Bomb, Gem } from 'lucide-react';
import { CommitSlider } from '../components/CommitSlider';
import { PotTicker } from '../components/PotTicker';
import { useScreel } from '../context/ScreelContext';
import { minesPot, seedPot } from '../utils/potMath';

const GRID = 25;
const MINES = 5;

type Stage = 'ready' | 'live' | 'done';

function pickMines(): Set<number> {
  const spots = new Set<number>();
  while (spots.size < MINES) spots.add(Math.floor(Math.random() * GRID));
  return spots;
}

export function MinesGame({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, settleRound, state, setCommitMinutes } = useScreel();
  const [stage, setStage] = useState<Stage>('ready');
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [base, setBase] = useState(0);
  const [commit, setCommit] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const pot = minesPot(base || seedPot('mines', state.commitMinutes), revealed.size);

  const start = () => {
    const c = Math.min(state.commitMinutes, remaining);
    setCommit(c);
    setBase(seedPot('mines', c));
    setMines(pickMines());
    setRevealed(new Set());
    setBanner(null);
    setStage('live');
  };

  const bankIt = () => {
    if (stage !== 'live' || revealed.size === 0) return;
    const amount = Math.round(minesPot(base, revealed.size));
    const applied = settleRound({
      game: 'mines',
      delta: amount,
      detail: `Banked after ${revealed.size} safe tiles`,
      result: 'win',
    });
    setStage('done');
    setBanner({
      text: applied > 0 ? `Banked +${applied}m` : 'Kept — daily keep cap full.',
      kind: 'win',
    });
  };

  const reveal = (i: number) => {
    if (stage !== 'live' || revealed.has(i)) return;
    if (mines.has(i)) {
      setStage('done');
      const applied = settleRound({
        game: 'mines',
        delta: commit > 0 ? -commit : 0,
        detail: `Mine after ${revealed.size} safe · pot ${Math.round(minesPot(base, revealed.size))}m wiped`,
        result: 'lose',
      });
      setBanner({
        text:
          commit > 0
            ? `Hazard! Pot gone · ${Math.abs(applied)}m missed.`
            : 'Hazard! Pot wiped — bank unchanged.',
        kind: 'lose',
      });
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

      {stage === 'ready' ? (
        <CommitSlider
          value={state.commitMinutes}
          onChange={setCommitMinutes}
          remaining={remaining}
        />
      ) : (
        <PotTicker pot={pot} earnLeft={earnLeftToday} commit={commit} />
      )}

      <p className="lede" style={{ marginTop: 0 }}>
        Reveal safe tiles to grow the pot. Bank it anytime — or hit a mine and the pot is gone.
      </p>

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
        <div className="stat-tile" style={{ marginBottom: 10 }}>
          <div className="label">Safe tiles</div>
          <div className="value">{revealed.size}</div>
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
