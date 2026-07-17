import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { RewardBadge } from '../components/RewardBadge';
import { useScreel } from '../context/ScreelContext';
import { GAME_REWARDS } from '../types';

interface SlotSymbol {
  glyph: string;
  weight: number;
}

const SYMBOLS: SlotSymbol[] = [
  { glyph: '\u{1F352}', weight: 30 },
  { glyph: '\u{1F34B}', weight: 26 },
  { glyph: '\u{1F514}', weight: 20 },
  { glyph: '\u2B50', weight: 13 },
  { glyph: '\u{1F48E}', weight: 8 },
  { glyph: '7', weight: 3 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0);
const SPIN_MS = [900, 1500, 2100];
const REWARD = GAME_REWARDS.slots;

function draw(): SlotSymbol {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const s of SYMBOLS) {
    roll -= s.weight;
    if (roll <= 0) return s;
  }
  return SYMBOLS[0];
}

export function SlotsGame({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, completeChallenge } = useScreel();
  const [reels, setReels] = useState<string[]>(['\u{1F352}', '\u{1F514}', '\u{1F48E}']);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const [spinning, setSpinning] = useState(false);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);
  const spinTargets = useRef<(string | null)[]>([null, null, null]);

  const spin = () => {
    if (spinning) return;
    const result = [draw(), draw(), draw()];
    setSpinning(true);
    setBanner(null);
    setSpinningReels([true, true, true]);
    spinTargets.current = [null, null, null];

    const cycler = window.setInterval(() => {
      setReels((r) =>
        r.map((g, i) =>
          spinTargets.current[i] === null ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].glyph : g,
        ),
      );
    }, 70);

    result.forEach((sym, i) => {
      window.setTimeout(() => {
        spinTargets.current[i] = sym.glyph;
        setReels((r) => r.map((g, j) => (j === i ? sym.glyph : g)));
        setSpinningReels((s) => s.map((v, j) => (j === i ? false : v)));
        if (i === 2) {
          window.clearInterval(cycler);
          const [a, b, c] = result;
          const success = a.glyph === b.glyph || b.glyph === c.glyph || a.glyph === c.glyph;
          const awarded = completeChallenge({
            game: 'slots',
            success,
            detail: `${a.glyph} ${b.glyph} ${c.glyph}`,
          });
          setBanner({
            text: success
              ? awarded > 0
                ? `Match! +${awarded}m`
                : 'Match — earn cap full today.'
              : 'No match — bank unchanged.',
            kind: success ? 'win' : 'lose',
          });
          setSpinning(false);
        }
      }, SPIN_MS[i]);
    });
  };

  return (
    <div className="screen game-stage">
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

      <div className="slots-cabinet">
        <div className="slots-reels">
          {reels.map((g, i) => (
            <div key={i} className={`slots-reel ${spinningReels[i] ? 'spinning' : ''}`}>
              <span>{g}</span>
            </div>
          ))}
        </div>
        <p className="slots-paytable">Any pair or triple earns +{REWARD}m. No stake.</p>
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
        <button type="button" className="btn btn-primary btn-block" onClick={spin} disabled={spinning}>
          {spinning ? 'Spinning…' : 'Spin'}
        </button>
      </div>
    </div>
  );
}
