import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { CommitSlider } from '../components/CommitSlider';
import { PotTicker } from '../components/PotTicker';
import { useScreel } from '../context/ScreelContext';
import { seedPot } from '../utils/potMath';

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
  { glyph: '\u{1F514}', weight: 3 },
];

const TOTAL_WEIGHT = SYMBOLS.reduce((s, x) => s + x.weight, 0);
const SPIN_MS = [900, 1500, 2100];

function draw(): SlotSymbol {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const s of SYMBOLS) {
    roll -= s.weight;
    if (roll <= 0) return s;
  }
  return SYMBOLS[0];
}

type Stage = 'ready' | 'spinning' | 'choice' | 'done';

export function SlotsGame({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, settleRound, state, setCommitMinutes } = useScreel();
  const [reels, setReels] = useState<string[]>(['\u{1F352}', '\u{1F514}', '\u{1F48E}']);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const [stage, setStage] = useState<Stage>('ready');
  const [pot, setPot] = useState(0);
  const [commit, setCommit] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);
  const spinTargets = useRef<(string | null)[]>([null, null, null]);
  const potRef = useRef(0);
  const commitRef = useRef(0);
  const isDoubleRef = useRef(false);

  const spin = (forDouble: boolean) => {
    if (stage === 'spinning') return;
    if (!forDouble) {
      const c = Math.min(state.commitMinutes, remaining);
      setCommit(c);
      commitRef.current = c;
      const b = seedPot('slots', c);
      setPot(b);
      potRef.current = b;
      isDoubleRef.current = false;
    } else {
      isDoubleRef.current = true;
    }

    const result = [draw(), draw(), draw()];
    setStage('spinning');
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
          if (success) {
            if (isDoubleRef.current) {
              const amount = Math.round(potRef.current * 2);
              potRef.current = amount;
              setPot(amount);
              const applied = settleRound({
                game: 'slots',
                delta: amount,
                detail: `Double keep · ${a.glyph} ${b.glyph} ${c.glyph}`,
                result: 'win',
              });
              setBanner({
                text: applied > 0 ? `Doubled! +${applied}m` : 'Match — keep cap full.',
                kind: 'win',
              });
              setStage('done');
            } else {
              setBanner({ text: 'Match! Bank it or one double-up respin.', kind: 'win' });
              setStage('choice');
            }
          } else {
            const applied = settleRound({
              game: 'slots',
              delta: commitRef.current > 0 ? -commitRef.current : 0,
              detail: `${a.glyph} ${b.glyph} ${c.glyph}`,
              result: 'lose',
            });
            setBanner({
              text:
                commitRef.current > 0
                  ? `No match · ${Math.abs(applied)}m missed`
                  : 'No match — pot wiped.',
              kind: 'lose',
            });
            setStage('done');
          }
        }
      }, SPIN_MS[i]);
    });
  };

  const bankIt = () => {
    const applied = settleRound({
      game: 'slots',
      delta: Math.round(potRef.current),
      detail: 'Banked match pot',
      result: 'win',
    });
    setBanner({
      text: applied > 0 ? `Banked +${applied}m` : 'Kept — daily keep cap full.',
      kind: 'win',
    });
    setStage('done');
  };

  return (
    <div className="screen game-stage">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={stage === 'spinning'}>
          <ArrowLeft size={16} /> Play
        </button>
        <div className="bj-balance">
          <span>Minutes left</span>
          <strong>{remaining}m</strong>
        </div>
      </div>

      {stage === 'ready' || stage === 'done' ? (
        <CommitSlider
          value={state.commitMinutes}
          onChange={setCommitMinutes}
          remaining={remaining}
        />
      ) : (
        <PotTicker pot={pot} earnLeft={earnLeftToday} commit={commit} />
      )}

      <div className="slots-cabinet">
        <div className="slots-reels">
          {reels.map((g, i) => (
            <div key={i} className={`slots-reel ${spinningReels[i] ? 'spinning' : ''}`}>
              <span>{g}</span>
            </div>
          ))}
        </div>
        <p className="slots-paytable">Any pair or triple grows the pot. Then bank — or one double-up respin.</p>
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
        {(stage === 'ready' || stage === 'done') && (
          <button type="button" className="btn btn-primary btn-block" onClick={() => spin(false)}>
            Spin
          </button>
        )}
        {stage === 'choice' && (
          <div className="bj-actions">
            <button type="button" className="btn btn-gold" onClick={bankIt}>
              Bank it ({Math.round(pot)}m)
            </button>
            <button type="button" className="btn btn-primary" onClick={() => spin(true)}>
              Double up
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
