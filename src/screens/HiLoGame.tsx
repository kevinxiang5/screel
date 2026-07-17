import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { WagerBar } from '../components/WagerBar';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';

const HOUSE = 0.96;
const LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const SUITS = ['♠', '♥', '♦', '♣'];

type Stage = 'idle' | 'live' | 'bust' | 'cashed';

function label(v: number): string {
  return LABELS[v] ?? String(v);
}

function drawValue(exclude?: number): number {
  // 2..14; redraw ties so every guess is strictly high or low.
  let v = 2 + Math.floor(Math.random() * 13);
  while (v === exclude) v = 2 + Math.floor(Math.random() * 13);
  return v;
}

function randomSuit(): string {
  return SUITS[Math.floor(Math.random() * SUITS.length)];
}

export function HiLoGame({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound } = useScreel();
  const { toast } = useScreelUI();
  const [wager, setWager] = useState(0);
  const [stage, setStage] = useState<Stage>('idle');
  const [card, setCard] = useState(8);
  const [suit, setSuit] = useState('♠');
  const [mult, setMult] = useState(1);
  const [streak, setStreak] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const live = stage === 'live';
  const cashValue = Math.floor(wager * mult);
  // 12 possible non-tie next cards.
  const pHigher = (14 - card) / 12;
  const pLower = (card - 2) / 12;

  const start = () => {
    if (wager < 1 || wager > remaining) {
      toast('Set a wager within your bank first.', { title: 'No chips down', tone: 'warn' });
      return;
    }
    setCard(drawValue());
    setSuit(randomSuit());
    setMult(1);
    setStreak(0);
    setBanner(null);
    setStage('live');
  };

  const guess = (dir: 'higher' | 'lower') => {
    if (!live) return;
    const next = drawValue(card);
    const won = dir === 'higher' ? next > card : next < card;
    setCard(next);
    setSuit(randomSuit());
    if (!won) {
      setStage('bust');
      setBanner({ text: `${label(next)} lands. −${wager}m after ${streak} calls.`, kind: 'lose' });
      settleRound({
        game: 'hilo',
        wager,
        payout: 0,
        result: 'lose',
        detail: `Busted on ${label(next)} after ${streak} correct calls`,
      });
      return;
    }
    const p = dir === 'higher' ? pHigher : pLower;
    setMult((m) => m * (HOUSE / p));
    setStreak((s) => s + 1);
  };

  const cashOut = () => {
    if (!live || streak === 0) return;
    setStage('cashed');
    setBanner({ text: `Cashed ${cashValue}m (+${cashValue - wager}m)`, kind: 'win' });
    settleRound({
      game: 'hilo',
      wager,
      payout: cashValue,
      result: 'win',
      detail: `Cashed ×${mult.toFixed(2)} after ${streak} correct calls`,
    });
  };

  const red = suit === '♥' || suit === '♦';

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

      <div className="hilo-stage">
        <motion.div
          key={`${card}-${suit}-${streak}-${stage}`}
          className={`hilo-card ${red ? 'red' : ''}`}
          initial={{ rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.32 }}
        >
          <span className="hilo-rank">{label(card)}</span>
          <span className="hilo-suit">{suit}</span>
        </motion.div>

        <div className="mines-meta">
          <div className="stat-tile">
            <div className="label">Multiplier</div>
            <div className="value">×{mult.toFixed(2)}</div>
          </div>
          <div className="stat-tile">
            <div className="label">Streak</div>
            <div className="value">{streak}</div>
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
        {stage === 'idle' && (
          <>
            <WagerBar wager={wager} onChange={setWager} max={remaining} />
            <button type="button" className="btn btn-primary btn-block" onClick={start} disabled={wager < 1}>
              Deal · {wager}m
            </button>
          </>
        )}
        {live && (
          <>
            <div className="bj-actions">
              <button type="button" className="btn btn-secondary" onClick={() => guess('lower')} disabled={card === 2}>
                <ArrowDown size={16} /> Lower ×{card === 2 ? '—' : (HOUSE / pLower).toFixed(2)}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => guess('higher')} disabled={card === 14}>
                <ArrowUp size={16} /> Higher ×{card === 14 ? '—' : (HOUSE / pHigher).toFixed(2)}
              </button>
            </div>
            <button
              type="button"
              className="btn btn-gold btn-block"
              onClick={cashOut}
              disabled={streak === 0}
              style={{ marginTop: 10 }}
            >
              {streak === 0 ? 'Make a call…' : `Cash out ${cashValue}m`}
            </button>
          </>
        )}
        {(stage === 'bust' || stage === 'cashed') && (
          <button type="button" className="btn btn-primary btn-block" onClick={() => setStage('idle')}>
            New run
          </button>
        )}
      </div>
    </div>
  );
}
