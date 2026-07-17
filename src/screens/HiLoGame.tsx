import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { RewardBadge } from '../components/RewardBadge';
import { useScreel } from '../context/ScreelContext';
import { GAME_REWARDS } from '../types';

const NEED = 3;
const REWARD = GAME_REWARDS.hilo;
const LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const SUITS = ['♠', '♥', '♦', '♣'];

type Stage = 'ready' | 'live' | 'done';

function label(v: number): string {
  return LABELS[v] ?? String(v);
}

function drawValue(exclude?: number): number {
  let v = 2 + Math.floor(Math.random() * 13);
  while (v === exclude) v = 2 + Math.floor(Math.random() * 13);
  return v;
}

export function HiLoGame({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, completeChallenge } = useScreel();
  const [stage, setStage] = useState<Stage>('ready');
  const [card, setCard] = useState(8);
  const [suit, setSuit] = useState('♠');
  const [streak, setStreak] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const start = () => {
    setCard(drawValue());
    setSuit(SUITS[Math.floor(Math.random() * SUITS.length)]);
    setStreak(0);
    setBanner(null);
    setStage('live');
  };

  const guess = (dir: 'higher' | 'lower') => {
    if (stage !== 'live') return;
    const next = drawValue(card);
    const won = dir === 'higher' ? next > card : next < card;
    setCard(next);
    setSuit(SUITS[Math.floor(Math.random() * SUITS.length)]);
    if (!won) {
      setStage('done');
      completeChallenge({
        game: 'hilo',
        success: false,
        detail: `Missed after ${streak} correct`,
      });
      setBanner({ text: `${label(next)} — streak broken. Bank unchanged.`, kind: 'lose' });
      return;
    }
    const nextStreak = streak + 1;
    setStreak(nextStreak);
    if (nextStreak >= NEED) {
      setStage('done');
      const awarded = completeChallenge({
        game: 'hilo',
        success: true,
        detail: `${NEED} correct calls in a row`,
      });
      setBanner({
        text: awarded > 0 ? `${NEED} in a row! +${awarded}m` : 'Challenge cleared — earn cap full.',
        kind: 'win',
      });
    }
  };

  const red = suit === '♥' || suit === '♦';

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

      <div className="hilo-stage">
        <motion.div
          key={`${card}-${suit}-${streak}`}
          className={`hilo-card ${red ? 'red' : ''}`}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
        >
          <span className="hilo-rank">{label(card)}</span>
          <span className="hilo-suit">{suit}</span>
        </motion.div>
        <div className="mines-meta">
          <div className="stat-tile">
            <div className="label">Streak</div>
            <div className="value">
              {streak}/{NEED}
            </div>
          </div>
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
        <p className="rl-hint">Call higher or lower {NEED} times in a row to earn minutes.</p>
        {stage === 'ready' || stage === 'done' ? (
          <button type="button" className="btn btn-primary btn-block" onClick={start}>
            {stage === 'done' ? 'New run' : 'Deal'}
          </button>
        ) : (
          <div className="bj-actions">
            <button type="button" className="btn btn-secondary" onClick={() => guess('lower')} disabled={card === 2}>
              <ArrowDown size={16} /> Lower
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => guess('higher')} disabled={card === 14}>
              <ArrowUp size={16} /> Higher
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
