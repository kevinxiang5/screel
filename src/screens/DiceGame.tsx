import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Dices } from 'lucide-react';
import { CommitSlider } from '../components/CommitSlider';
import { PotTicker } from '../components/PotTicker';
import { useScreel } from '../context/ScreelContext';
import { dicePot, seedPot } from '../utils/potMath';

export function DiceGame({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, settleRound, state, setCommitMinutes } = useScreel();
  const [target, setTarget] = useState(50);
  const [rolling, setRolling] = useState(false);
  const [roll, setRoll] = useState<number | null>(null);
  const [history, setHistory] = useState<{ roll: number; won: boolean }[]>([]);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);
  const [lastCommit, setLastCommit] = useState(0);

  const previewPot = dicePot(seedPot('dice', state.commitMinutes), target);

  const doRoll = () => {
    if (rolling) return;
    const c = Math.min(state.commitMinutes, remaining);
    setLastCommit(c);
    const pot = Math.round(dicePot(seedPot('dice', c), target));
    setRolling(true);
    setBanner(null);
    let ticks = 0;
    const spin = window.setInterval(() => {
      ticks += 1;
      setRoll(Math.floor(Math.random() * 100));
      if (ticks >= 12) {
        window.clearInterval(spin);
        const result = Math.floor(Math.random() * 100);
        const won = result < target;
        setRoll(result);
        setHistory((h) => [{ roll: result, won }, ...h].slice(0, 12));
        if (won) {
          const applied = settleRound({
            game: 'dice',
            delta: pot,
            detail: `Rolled ${result} under ${target}`,
            result: 'win',
          });
          setBanner({
            text: applied > 0 ? `${result} under ${target} · +${applied}m` : 'Hit — keep cap full.',
            kind: 'win',
          });
        } else {
          const applied = settleRound({
            game: 'dice',
            delta: c > 0 ? -c : 0,
            detail: `Rolled ${result}, needed under ${target}`,
            result: 'lose',
          });
          setBanner({
            text:
              c > 0
                ? `${result} over ${target} · ${Math.abs(applied)}m missed`
                : `${result} over ${target} — no keep.`,
            kind: 'lose',
          });
        }
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

      <CommitSlider
        value={state.commitMinutes}
        onChange={setCommitMinutes}
        remaining={remaining}
        disabled={rolling}
      />
      <PotTicker pot={previewPot} earnLeft={earnLeftToday} commit={lastCommit || state.commitMinutes} label="If you hit" />

      <div className="dice-stage">
        <div className="commit-slider" style={{ marginBottom: 12 }}>
          <div className="commit-slider-head">
            <span className="hand-label">Roll under</span>
            <strong>{target}</strong>
          </div>
          <input
            type="range"
            min={10}
            max={90}
            step={1}
            value={target}
            disabled={rolling}
            onChange={(e) => setTarget(Number(e.target.value))}
            aria-label="Target number"
          />
          <p className="commit-slider-hint">
            Lower target = harder roll, bigger pot. Chance ≈ {target}%.
          </p>
        </div>

        <div className={`dice-readout ${roll !== null && !rolling ? (roll < target ? 'win' : 'lose') : ''}`}>
          {roll === null ? <Dices size={44} /> : roll}
        </div>
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
          {rolling ? 'Rolling…' : `Roll for ~${Math.round(previewPot)}m`}
        </button>
      </div>
    </div>
  );
}
