import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { RewardBadge } from '../components/RewardBadge';
import { useScreel } from '../context/ScreelContext';
import { GAME_REWARDS } from '../types';
import { colorOf, spinWheel, type SpinResult } from '../utils/roulette';

type Pick = 'red' | 'black' | 'green';
const REWARD = GAME_REWARDS.roulette;

export function RouletteTable({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, completeChallenge } = useScreel();
  const [pick, setPick] = useState<Pick>('red');
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  const spin = async () => {
    if (spinning) return;
    setSpinning(true);
    setBanner(null);
    setResult(null);
    await new Promise((r) => setTimeout(r, 900));
    const spun = spinWheel();
    setResult(spun);
    setHistory((h) => [spun.number, ...h].slice(0, 12));
    const landed = colorOf(spun.number);
    const success = landed === pick;
    const awarded = completeChallenge({
      game: 'roulette',
      success,
      detail: `Picked ${pick}, landed ${spun.number} (${landed})`,
    });
    setBanner({
      text: success
        ? awarded > 0
          ? `${spun.number} ${landed} · +${awarded}m`
          : 'Correct color — earn cap full for today.'
        : `${spun.number} ${landed} — no reward. Bank unchanged.`,
      kind: success ? 'win' : 'lose',
    });
    setSpinning(false);
  };

  return (
    <div className="screen game-stage rl-screen">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={spinning}>
          <ArrowLeft size={16} /> Play
        </button>
        <div className="bj-balance">
          <span>Minutes left</span>
          <strong>{remaining}m</strong>
        </div>
      </div>

      <RewardBadge reward={REWARD} earnLeft={earnLeftToday} />

      <div className="challenge-panel">
        <p className="lede" style={{ margin: 0 }}>
          Pick a color, then spin. Match it to earn minutes. Wrong color = no reward (nothing taken).
        </p>
        <div className="pick-row">
          {(['red', 'black', 'green'] as Pick[]).map((c) => (
            <button
              key={c}
              type="button"
              className={`btn ${pick === c ? 'btn-primary' : 'btn-secondary'} pick-${c}`}
              disabled={spinning}
              onClick={() => setPick(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className={`dice-readout ${result ? (colorOf(result.number) === pick ? 'win' : 'lose') : ''}`}>
          {spinning ? '…' : result ? result.number : '·'}
        </div>
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
        <button type="button" className="btn btn-primary btn-block" onClick={() => void spin()} disabled={spinning}>
          {spinning ? 'Spinning…' : 'Spin'}
        </button>
      </div>
    </div>
  );
}
