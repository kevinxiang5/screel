import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Dices } from 'lucide-react';
import { WagerBar } from '../components/WagerBar';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';

const HOUSE = 0.97;

export function DiceGame({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound } = useScreel();
  const { toast } = useScreelUI();
  const [wager, setWager] = useState(0);
  const [target, setTarget] = useState(50);
  const [rolling, setRolling] = useState(false);
  const [roll, setRoll] = useState<number | null>(null);
  const [history, setHistory] = useState<{ roll: number; won: boolean }[]>([]);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const winChance = target;
  const payoutMult = (HOUSE * 100) / target;

  const doRoll = () => {
    if (rolling) return;
    if (wager < 1 || wager > remaining) {
      toast('Set a wager within your bank first.', { title: 'No chips down', tone: 'warn' });
      return;
    }
    setRolling(true);
    setBanner(null);

    // Quick shuffle animation, then the real roll.
    let ticks = 0;
    const spin = window.setInterval(() => {
      ticks += 1;
      setRoll(Math.floor(Math.random() * 100));
      if (ticks >= 12) {
        window.clearInterval(spin);
        const result = Math.floor(Math.random() * 100);
        const won = result < target;
        const payout = won ? Math.floor(wager * payoutMult) : 0;
        setRoll(result);
        setHistory((h) => [{ roll: result, won }, ...h].slice(0, 12));
        setBanner(
          won
            ? { text: `${result} rolls under ${target} · +${payout - wager}m`, kind: 'win' }
            : { text: `${result} — over the line · −${wager}m`, kind: 'lose' },
        );
        settleRound({
          game: 'dice',
          wager,
          payout,
          result: won ? 'win' : 'lose',
          detail: `Rolled ${result}, needed under ${target} (×${payoutMult.toFixed(2)})`,
        });
        setRolling(false);
      }
    }, 60);
  };

  return (
    <div className="screen game-stage">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={rolling}>
          <ArrowLeft size={16} /> Floor
        </button>
        <div className="bj-balance">
          <span>Balance</span>
          <strong>{Math.max(0, remaining - (rolling ? wager : 0))}m</strong>
        </div>
      </div>

      <div className="dice-stage">
        <div className={`dice-readout ${roll !== null && !rolling ? (roll < target ? 'win' : 'lose') : ''}`}>
          {roll === null ? <Dices size={44} /> : roll}
        </div>

        <div className="dice-slider-block">
          <div className="dice-slider-meta">
            <span>
              Roll under <strong>{target}</strong>
            </span>
            <span>
              Win {winChance}% · pays ×{payoutMult.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={96}
            value={target}
            disabled={rolling}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
          <div className="dice-track-labels">
            <span>Safer</span>
            <span>Degen</span>
          </div>
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
            exit={{ opacity: 0 }}
          >
            {banner.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bj-dock">
        <WagerBar wager={wager} onChange={setWager} max={remaining} disabled={rolling} />
        <button type="button" className="btn btn-primary btn-block" onClick={doRoll} disabled={rolling || wager < 1}>
          {rolling ? 'Rolling…' : `Roll · ${wager}m`}
        </button>
      </div>
    </div>
  );
}
