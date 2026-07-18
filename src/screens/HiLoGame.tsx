import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { PotTicker } from '../components/PotTicker';
import { WagerSelector } from '../components/WagerSelector';
import { useScreel } from '../context/ScreelContext';
import { hiloPot, seedPot } from '../utils/potMath';

const LABELS: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const SUITS = ['♠', '♥', '♦', '♣'];

type Stage = 'ready' | 'live' | 'done';

function label(v: number): string {
  return LABELS[v] ?? String(v);
}

function drawValue(exclude?: number, tight = false): number {
  const min = tight ? 5 : 2;
  const spread = tight ? 7 : 13;
  let v = min + Math.floor(Math.random() * spread);
  while (v === exclude) v = min + Math.floor(Math.random() * spread);
  return v;
}

export function HiLoGame({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, settleRound, consumeChallenge, state, setWagerMinutes } = useScreel();
  const [stage, setStage] = useState<Stage>('ready');
  const [deckMode, setDeckMode] = useState<'classic' | 'tight'>('classic');
  const [card, setCard] = useState(8);
  const [suit, setSuit] = useState('♠');
  const [streak, setStreak] = useState(0);
  const [base, setBase] = useState(0);
  const [stake, setStake] = useState(0);
  const [nearMiss, setNearMiss] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const pot = hiloPot(
    base || seedPot('hilo', Math.min(state.wagerMinutes, remaining, earnLeftToday)) * (deckMode === 'tight' ? 1.5 : 1),
    streak,
  );

  const start = () => {
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
    const nextStake = Math.min(state.wagerMinutes, remaining, earnLeftToday);
    setStake(nextStake);
    setBase(seedPot('hilo', nextStake) * (deckMode === 'tight' ? 1.5 : 1));
    setCard(drawValue(undefined, deckMode === 'tight'));
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
      pot: amount,
      kept: true,
      wager: stake,
      detail: `Banked after ${streak} correct calls`,
      result: 'win',
    });
    setStage('done');
    setBanner({
      text: applied > 0 ? `Won +${applied}m after ${streak}` : 'Win recorded — daily winnings cap reached.',
      kind: 'win',
    });
  };

  const guess = (dir: 'higher' | 'lower') => {
    if (stage !== 'live') return;
    const next = drawValue(card, deckMode === 'tight');
    const won = dir === 'higher' ? next > card : next < card;
    setCard(next);
    setSuit(SUITS[Math.floor(Math.random() * SUITS.length)]);
    if (!won) {
      setNearMiss(`Would have been ${label(next)} — streak broken.`);
      setStage('done');
      settleRound({
        game: 'hilo',
        pot: 0,
        kept: false,
        wager: stake,
        detail: `Missed after ${streak} correct`,
        result: 'lose',
      });
      setBanner({ text: `${label(next)} missed · lost ${stake}m`, kind: 'lose' });
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

      <PotTicker pot={pot} earnLeft={earnLeftToday} wager={stake || Math.min(state.wagerMinutes, remaining, earnLeftToday)} />

      {(stage === 'ready' || stage === 'done') && (
        <WagerSelector value={state.wagerMinutes} remaining={remaining} limit={earnLeftToday} onChange={setWagerMinutes} />
      )}

      {(stage === 'ready' || stage === 'done') && (
        <div className="option-strip">
          <span className="hand-label">Deck</span>
          <button type="button" className={deckMode === 'classic' ? 'active' : ''} onClick={() => setDeckMode('classic')}>
            Classic · 2–A
          </button>
          <button type="button" className={deckMode === 'tight' ? 'active' : ''} onClick={() => setDeckMode('tight')}>
            Tight · 5–J · 1.5×
          </button>
        </div>
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
        <p className="rl-hint">Correct calls grow the payout. Bank anytime — a miss loses your stake.</p>
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
