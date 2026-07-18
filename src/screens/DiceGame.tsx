import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Dices } from 'lucide-react';
import { PotTicker } from '../components/PotTicker';
import { WagerSelector } from '../components/WagerSelector';
import { useScreel } from '../context/ScreelContext';
import { dicePot, seedPot } from '../utils/potMath';

export function DiceGame({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, settleRound, consumeChallenge, state, setWagerMinutes } = useScreel();
  const [mode, setMode] = useState<'under' | 'over'>('under');
  const [target, setTarget] = useState(50);
  const [rolling, setRolling] = useState(false);
  const [roll, setRoll] = useState<number | null>(null);
  const [history, setHistory] = useState<{ roll: number; won: boolean }[]>([]);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);
  const chance = mode === 'under' ? target : 100 - target;
  const selectedStake = Math.min(state.wagerMinutes, remaining, earnLeftToday);
  const previewPot = dicePot(seedPot('dice', selectedStake), chance);

  const doRoll = () => {
    if (rolling) return;
    if (earnLeftToday < 1) {
      setBanner({ text: 'Daily winnings cap reached. Come back after reset.', kind: 'lose' });
      return;
    }
    if (remaining < 1) {
      setBanner({ text: 'No minutes available to stake.', kind: 'lose' });
      return;
    }
    if (!consumeChallenge()) {
      setBanner({ text: 'Daily challenges used — refill from the Play screen.', kind: 'lose' });
      return;
    }
    const stake = Math.min(state.wagerMinutes, remaining, earnLeftToday);
    const pot = Math.round(dicePot(seedPot('dice', stake), chance));
    setRolling(true);
    setBanner(null);
    let ticks = 0;
    const spin = window.setInterval(() => {
      ticks += 1;
      setRoll(Math.floor(Math.random() * 100));
      if (ticks >= 12) {
        window.clearInterval(spin);
        const result = Math.floor(Math.random() * 100);
        const won = mode === 'under' ? result < target : result > target;
        setRoll(result);
        setHistory((h) => [{ roll: result, won }, ...h].slice(0, 12));
        if (won) {
          const applied = settleRound({
            game: 'dice',
            pot,
            kept: true,
            wager: stake,
            detail: `Rolled ${result} ${mode} ${target}`,
            result: 'win',
          });
          setBanner({
            text: applied > 0 ? `${result} ${mode} ${target} · +${applied}m` : 'Hit — daily winnings cap reached.',
            kind: 'win',
          });
        } else {
          settleRound({
            game: 'dice',
            pot: 0,
            kept: false,
            wager: stake,
            detail: `Rolled ${result}, needed ${mode} ${target}`,
            result: 'lose',
          });
          setBanner({ text: `${result} missed ${mode} ${target} · lost ${stake}m`, kind: 'lose' });
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

      <PotTicker pot={previewPot} earnLeft={earnLeftToday} wager={selectedStake} label="Potential payout" />

      <WagerSelector
        value={state.wagerMinutes}
        remaining={remaining}
        limit={earnLeftToday}
        onChange={setWagerMinutes}
        disabled={rolling}
      />

      <div className="option-strip">
        <span className="hand-label">Call</span>
        {(['under', 'over'] as const).map((option) => (
          <button
            type="button"
            key={option}
            className={mode === option ? 'active' : ''}
            disabled={rolling}
            onClick={() => setMode(option)}
          >
            Roll {option}
          </button>
        ))}
      </div>

      <div className="dice-stage">
        <div className="risk-slider" style={{ marginBottom: 12 }}>
          <div className="risk-slider-head">
            <span className="hand-label">Roll {mode}</span>
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
          <p className="risk-slider-hint">
            Move the target to tune difficulty. Chance ≈ {chance}%.
          </p>
        </div>

        <div className={`dice-readout ${roll !== null && !rolling ? ((mode === 'under' ? roll < target : roll > target) ? 'win' : 'lose') : ''}`}>
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
