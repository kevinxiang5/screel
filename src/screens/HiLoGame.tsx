import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { CommitSlider } from '../components/CommitSlider';
import { PotTicker } from '../components/PotTicker';
import { useScreel } from '../context/ScreelContext';
import { hiloPot, seedPot } from '../utils/potMath';

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
  const { remaining, earnLeftToday, settleRound, state, setCommitMinutes } = useScreel();
  const [stage, setStage] = useState<Stage>('ready');
  const [card, setCard] = useState(8);
  const [suit, setSuit] = useState('♠');
  const [streak, setStreak] = useState(0);
  const [base, setBase] = useState(0);
  const [commit, setCommit] = useState(0);
  const [nearMiss, setNearMiss] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const pot = hiloPot(base || seedPot('hilo', state.commitMinutes), streak);

  const start = () => {
    const c = Math.min(state.commitMinutes, remaining);
    setCommit(c);
    setBase(seedPot('hilo', c));
    setCard(drawValue());
    setSuit(SUITS[Math.floor(Math.random() * SUITS.length)]);
    setStreak(0);
    setNearMiss(null);
    setBanner(null);
    setStage('live');
  };

  const bankIt = () => {
    if (stage !== 'live' || streak === 0) return;
    const amount = Math.round(hiloPot(base, streak));
    const applied = settleRound({
      game: 'hilo',
      delta: amount,
      detail: `Banked after ${streak} correct calls`,
      result: 'win',
    });
    setStage('done');
    setBanner({
      text: applied > 0 ? `Banked +${applied}m after ${streak}` : 'Kept — daily keep cap full.',
      kind: 'win',
    });
  };

  const guess = (dir: 'higher' | 'lower') => {
    if (stage !== 'live') return;
    const next = drawValue(card);
    const won = dir === 'higher' ? next > card : next < card;
    setCard(next);
    setSuit(SUITS[Math.floor(Math.random() * SUITS.length)]);
    if (!won) {
      setNearMiss(`Would have been ${label(next)} — streak broken.`);
      setStage('done');
      const applied = settleRound({
        game: 'hilo',
        delta: commit > 0 ? -commit : 0,
        detail: `Missed after ${streak} correct`,
        result: 'lose',
      });
      setBanner({
        text:
          commit > 0
            ? `${label(next)} — pot wiped · ${Math.abs(applied)}m missed.`
            : `${label(next)} — pot wiped. Bank unchanged.`,
        kind: 'lose',
      });
      return;
    }
    setStreak((s) => s + 1);
    setNearMiss(null);
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

      {stage === 'ready' ? (
        <CommitSlider
          value={state.commitMinutes}
          onChange={setCommitMinutes}
          remaining={remaining}
        />
      ) : (
        <PotTicker pot={pot} earnLeft={earnLeftToday} commit={commit} />
      )}

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
            <div className="value">{streak}</div>
          </div>
        </div>
        {nearMiss && <p className="near-miss">{nearMiss}</p>}
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
        <p className="rl-hint">Correct calls grow the pot. Bank anytime — a miss wipes it.</p>
        {stage === 'ready' || stage === 'done' ? (
          <button type="button" className="btn btn-primary btn-block" onClick={start}>
            {stage === 'done' ? 'New run' : 'Start'}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-gold btn-block"
              onClick={bankIt}
              disabled={streak === 0}
              style={{ marginBottom: 10 }}
            >
              Bank it ({Math.round(pot)}m)
            </button>
            <div className="bj-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => guess('lower')}
                disabled={card === 2}
              >
                <ArrowDown size={16} /> Lower
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => guess('higher')}
                disabled={card === 14}
              >
                <ArrowUp size={16} /> Higher
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
