import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Bomb, Gem } from 'lucide-react';
import { RewardBadge } from '../components/RewardBadge';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';
import { GAME_REWARDS } from '../types';

const GRID = 25;
const MINES = 5;
const NEED_SAFE = 5;
const REWARD = GAME_REWARDS.mines;

type Stage = 'ready' | 'live' | 'done';

function pickMines(): Set<number> {
  const spots = new Set<number>();
  while (spots.size < MINES) spots.add(Math.floor(Math.random() * GRID));
  return spots;
}

export function MinesGame({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, completeChallenge } = useScreel();
  const { toast } = useScreelUI();
  const [stage, setStage] = useState<Stage>('ready');
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const start = () => {
    if (earnLeftToday <= 0) {
      toast('Daily earn cap reached — try again tomorrow.', { title: 'Cap reached', tone: 'warn' });
    }
    setMines(pickMines());
    setRevealed(new Set());
    setBanner(null);
    setStage('live');
  };

  const reveal = (i: number) => {
    if (stage !== 'live' || revealed.has(i)) return;
    if (mines.has(i)) {
      setStage('done');
      completeChallenge({
        game: 'mines',
        success: false,
        detail: `Hit a mine after ${revealed.size} safe tiles`,
      });
      setBanner({ text: 'Mine! No reward — bank unchanged.', kind: 'lose' });
      return;
    }
    const next = new Set(revealed);
    next.add(i);
    setRevealed(next);
    if (next.size >= NEED_SAFE) {
      setStage('done');
      const awarded = completeChallenge({
        game: 'mines',
        success: true,
        detail: `Cleared ${NEED_SAFE} safe tiles`,
      });
      setBanner({
        text: awarded > 0 ? `Clear! +${awarded}m` : 'Clear — earn cap full today.',
        kind: 'win',
      });
    }
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

      <RewardBadge reward={REWARD} earnLeft={earnLeftToday} />
      <p className="lede" style={{ marginTop: 0 }}>
        Reveal {NEED_SAFE} safe tiles without a mine. Success earns minutes; a mine ends the run with no loss.
      </p>

      <div className={`mines-grid ${stage === 'done' ? 'over' : ''}`}>
        {Array.from({ length: GRID }, (_, i) => {
          const isMine = mines.has(i);
          const isOpen = revealed.has(i);
          const showMine = stage === 'done' && isMine;
          return (
            <button
              key={i}
              type="button"
              className={`mine-tile ${isOpen ? 'safe' : ''} ${showMine ? 'boom' : ''}`}
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
          <div className="value">
            {revealed.size}/{NEED_SAFE}
          </div>
        </div>
        {(stage === 'ready' || stage === 'done') && (
          <button type="button" className="btn btn-primary btn-block" onClick={start}>
            {stage === 'done' ? 'New board' : 'Start challenge'}
          </button>
        )}
      </div>
    </div>
  );
}
