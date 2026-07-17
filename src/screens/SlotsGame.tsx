import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { WagerBar } from '../components/WagerBar';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';

interface SlotSymbol {
  glyph: string;
  weight: number;
  /** Multiplier for three of a kind. */
  triple: number;
}

const SYMBOLS: SlotSymbol[] = [
  { glyph: '\u{1F352}', weight: 30, triple: 4 }, // cherries
  { glyph: '\u{1F34B}', weight: 26, triple: 6 }, // lemon
  { glyph: '\u{1F514}', weight: 20, triple: 10 }, // bell
  { glyph: '\u2B50', weight: 13, triple: 20 }, // star
  { glyph: '\u{1F48E}', weight: 8, triple: 50 }, // gem
  { glyph: '7', weight: 3, triple: 150 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0);
/** Any pair pays this multiplier. */
const PAIR_MULT = 1.5;
const SPIN_MS = [900, 1500, 2100];

function draw(): SlotSymbol {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const s of SYMBOLS) {
    roll -= s.weight;
    if (roll <= 0) return s;
  }
  return SYMBOLS[0];
}

export function SlotsGame({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound } = useScreel();
  const { toast } = useScreelUI();
  const [wager, setWager] = useState(0);
  const [reels, setReels] = useState<string[]>(['\u{1F352}', '\u{1F514}', '\u{1F48E}']);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const [spinning, setSpinning] = useState(false);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' | 'push' } | null>(null);
  const timers = useRef<number[]>([]);
  const spinTargets = useRef<(string | null)[]>([null, null, null]);

  const spin = () => {
    if (spinning) return;
    if (wager < 1 || wager > remaining) {
      toast('Set a wager within your bank first.', { title: 'No chips down', tone: 'warn' });
      return;
    }

    const result = [draw(), draw(), draw()];
    setSpinning(true);
    setBanner(null);
    setSpinningReels([true, true, true]);
    spinTargets.current = [null, null, null];

    // Cycle glyphs fast while each reel "spins".
    const cycler = window.setInterval(() => {
      setReels((r) =>
        r.map((g, i) =>
          spinTargets.current[i] === null ? SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].glyph : g,
        ),
      );
    }, 70);
    timers.current.push(cycler);

    result.forEach((sym, i) => {
      const t = window.setTimeout(() => {
        spinTargets.current[i] = sym.glyph;
        setReels((r) => r.map((g, j) => (j === i ? sym.glyph : g)));
        setSpinningReels((s) => s.map((v, j) => (j === i ? false : v)));
        if (i === 2) {
          window.clearInterval(cycler);
          settle(result);
        }
      }, SPIN_MS[i]);
      timers.current.push(t);
    });
  };

  const settle = (result: SlotSymbol[]) => {
    const [a, b, c] = result;
    let payout = 0;
    let text: string;
    if (a.glyph === b.glyph && b.glyph === c.glyph) {
      payout = Math.floor(wager * a.triple);
      text = `${a.glyph}${b.glyph}${c.glyph} Triple! +${payout - wager}m`;
    } else if (a.glyph === b.glyph || b.glyph === c.glyph || a.glyph === c.glyph) {
      payout = Math.floor(wager * PAIR_MULT);
      text = `Pair \u00b7 +${payout - wager}m`;
    } else {
      text = `No line \u00b7 \u2212${wager}m`;
    }
    const kind: 'win' | 'lose' | 'push' = payout > wager ? 'win' : payout === wager ? 'push' : 'lose';
    setBanner({ text, kind });
    setSpinning(false);
    settleRound({
      game: 'slots',
      wager,
      payout,
      result: kind,
      detail: `${a.glyph} ${b.glyph} ${c.glyph} \u2014 ${text}`,
    });
  };

  return (
    <div className="screen game-stage">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={spinning}>
          <ArrowLeft size={16} /> Floor
        </button>
        <div className="bj-balance">
          <span>Balance</span>
          <strong>{Math.max(0, remaining - (spinning ? wager : 0))}m</strong>
        </div>
      </div>

      <div className="slots-cabinet">
        <div className="slots-reels">
          {reels.map((g, i) => (
            <div key={i} className={`slots-reel ${spinningReels[i] ? 'spinning' : ''}`}>
              <span>{g}</span>
            </div>
          ))}
        </div>
        <div className="slots-paytable">
          {SYMBOLS.map((s) => (
            <span key={s.glyph}>
              {s.glyph}&times;3 pays &times;{s.triple}
            </span>
          ))}
          <span>Any pair &times;{PAIR_MULT}</span>
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
        <WagerBar wager={wager} onChange={setWager} max={remaining} disabled={spinning} />
        <button type="button" className="btn btn-primary btn-block" onClick={spin} disabled={spinning || wager < 1}>
          {spinning ? 'Spinning\u2026' : `Spin \u00b7 ${wager}m`}
        </button>
      </div>
    </div>
  );
}
