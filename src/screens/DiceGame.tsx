import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Dices } from 'lucide-react';
import { RewardBadge } from '../components/RewardBadge';
import { useScreel } from '../context/ScreelContext';
import { GAME_REWARDS } from '../types';

const REWARD = GAME_REWARDS.dice;
/** Fixed challenge: roll under 50 (easy to understand, no custom odds UI). */
const TARGET = 50;

export function DiceGame({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, completeChallenge } = useScreel();
  const [rolling, setRolling] = useState(false);
  const [roll, setRoll] = useState<number | null>(null);
  const [history, setHistory] = useState<{ roll: number; won: boolean }[]>([]);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const doRoll = () => {
    if (rolling) return;
    setRolling(true);
    setBanner(null);
    let ticks = 0;
    const spin = window.setInterval(() => {
      ticks += 1;
      setRoll(Math.floor(Math.random() * 100));
      if (ticks >= 12) {
        window.clearInterval(spin);
        const result = Math.floor(Math.random() * 100);
        const won = result < TARGET;
        setRoll(result);
        setHistory((h) => [{ roll: result, won }, ...h].slice(0, 12));
        const awarded = completeChallenge({
          game: 'dice',
          success: won,
          detail: `Rolled ${result}, needed under ${TARGET}`,
        });
        setBanner({
          text: won
            ? awarded > 0
              ? `${result} under ${TARGET} · +${awarded}m`
              : 'Hit the mark — earn cap full today.'
            : `${result} — over ${TARGET}. Bank unchanged.`,
          kind: won ? 'win' : 'lose',
        });
        setRolling(false);
      }
    }, 60);
  };

  return (
    <div className="screen game-stage">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={rolling}>
          <ArrowLeft size={16} /> Play
        </button>
        <div className="bj-balance">
          <span>Minutes left</span>
          <strong>{remaining}m</strong>
        </div>
      </div>

      <RewardBadge reward={REWARD} earnLeft={earnLeftToday} />

      <div className="dice-stage">
        <div className={`dice-readout ${roll !== null && !rolling ? (roll < TARGET ? 'win' : 'lose') : ''}`}>
          {roll === null ? <Dices size={44} /> : roll}
        </div>
        <p className="lede" style={{ margin: 0, textAlign: 'center' }}>
          Roll under <strong>{TARGET}</strong> to earn +{REWARD}m. Miss = no reward.
        </p>
        <div className="rl-history">
          <span className="hand-label">Last rolls</span>
          <div className="rl-history-row">
            {history.length === 0 && <span className="mute">—</span>}
            {history.map((h, i) => (
              <span key={`${h.roll}-${i}`} className={`rl-hist ${h.won ? 'green' : 'red'}`}>
                {h.roll}
              </span>
            ))}
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
        <button type="button" className="btn btn-primary btn-block" onClick={doRoll} disabled={rolling}>
          {rolling ? 'Rolling…' : 'Roll'}
        </button>
      </div>
    </div>
  );
}
