import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { CommitSlider } from '../components/CommitSlider';
import { PotTicker } from '../components/PotTicker';
import { useScreel } from '../context/ScreelContext';
import {
  createShoe,
  draw,
  handLabel,
  handValue,
  isBlackjack,
  isRed,
  type Card,
} from '../utils/blackjack';
import { seedPot } from '../utils/potMath';

type Phase = 'ready' | 'playing' | 'dealer' | 'result' | 'ride';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function CardFace({ card }: { card: Card }) {
  return (
    <>
      <div className="pcard-corner">
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
      <div className="pcard-suit">{card.suit}</div>
      <div className="pcard-corner br">
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
    </>
  );
}

function CardView({ card }: { card: Card }) {
  const faceDown = Boolean(card.hidden);
  return (
    <div className="pcard-scene">
      <div className={`pcard-flip ${faceDown ? 'face-down' : 'face-up'} ${isRed(card.suit) ? 'red' : ''}`}>
        <div className="pcard-face pcard-front">
          <CardFace card={card} />
        </div>
        <div className="pcard-face pcard-back" />
      </div>
    </div>
  );
}

export function BlackjackTable({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, settleRound, state, setCommitMinutes } = useScreel();
  const [phase, setPhase] = useState<Phase>('ready');
  const [shoe, setShoe] = useState<Card[]>(() => createShoe());
  const [dealer, setDealer] = useState<Card[]>([]);
  const [player, setPlayer] = useState<Card[]>([]);
  const [base, setBase] = useState(0);
  const [commit, setCommit] = useState(0);
  const [pot, setPot] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' | 'push' } | null>(null);
  const [busy, setBusy] = useState(false);
  const shoeRef = useRef(shoe);
  const potRef = useRef(0);
  const commitRef = useRef(0);
  shoeRef.current = shoe;

  const pull = () => {
    const r = draw(shoeRef.current);
    shoeRef.current = r.shoe;
    setShoe(r.shoe);
    return r.card;
  };

  const beginRound = async (ridePot?: number) => {
    setBusy(true);
    setBanner(null);
    setDealer([]);
    setPlayer([]);
    setPhase('playing');

    if (ridePot == null) {
      const c = Math.min(state.commitMinutes, remaining);
      setCommit(c);
      commitRef.current = c;
      const b = seedPot('blackjack', c);
      setBase(b);
      setPot(b);
      potRef.current = b;
    } else {
      setPot(ridePot);
      potRef.current = ridePot;
    }

    const p1 = pull();
    const d1 = pull();
    const p2 = pull();
    const d2 = { ...pull(), hidden: true };
    setPlayer([p1]);
    await sleep(200);
    setDealer([d1]);
    await sleep(200);
    setPlayer([p1, p2]);
    await sleep(200);
    setDealer([d1, d2]);

    if (isBlackjack([p1, p2])) {
      await finish([p1, p2], [d1, { ...d2, hidden: false }], true);
      return;
    }
    setBusy(false);
  };

  const hit = async () => {
    if (busy || phase !== 'playing') return;
    setBusy(true);
    const next = [...player, pull()];
    setPlayer(next);
    if (handValue(next) > 21) {
      await finish(next, dealer.map((c) => ({ ...c, hidden: false })), false);
      return;
    }
    setBusy(false);
  };

  const stand = async () => {
    if (busy || phase !== 'playing') return;
    setBusy(true);
    await finish(player, dealer, false);
  };

  const finish = async (pCards: Card[], dStart: Card[], natural: boolean) => {
    setPhase('dealer');
    let dCards: Card[] = dStart.map((c) => ({ ...c, hidden: false }));
    setDealer(dCards);
    await sleep(400);

    if (!natural && handValue(pCards) <= 21) {
      while (handValue(dCards) < 17) {
        dCards = [...dCards, pull()];
        setDealer(dCards);
        await sleep(500);
      }
    }

    const pv = handValue(pCards);
    const dv = handValue(dCards);
    let success = false;
    let result: 'win' | 'lose' | 'push' | 'blackjack' = 'lose';

    if (natural) {
      success = true;
      result = 'blackjack';
    } else if (pv > 21) {
      result = 'lose';
    } else if (dv > 21 || pv > dv) {
      success = true;
      result = 'win';
    } else if (pv === dv) {
      result = 'push';
    }

    if (success) {
      const amount = Math.round(potRef.current * (result === 'blackjack' ? 1.5 : 1));
      setPot(amount);
      potRef.current = amount;
      setBanner({
        text: result === 'blackjack' ? `Natural 21! Pot ${amount}m` : `You win · pot ${amount}m`,
        kind: 'win',
      });
      setPhase('ride');
      setBusy(false);
      return;
    }

    if (result === 'push') {
      settleRound({
        game: 'blackjack',
        delta: 0,
        detail: `${handLabel(pCards)} vs ${handLabel(dCards)} · push`,
        result: 'push',
      });
      setBanner({ text: 'Push — pot unchanged. Try again.', kind: 'push' });
      setPhase('result');
      setBusy(false);
      return;
    }

    const applied = settleRound({
      game: 'blackjack',
      delta: commitRef.current > 0 ? -commitRef.current : 0,
      detail: `${handLabel(pCards)} vs ${handLabel(dCards)}`,
      result: 'lose',
    });
    setBanner({
      text:
        commitRef.current > 0
          ? `Miss · ${Math.abs(applied)}m gone`
          : 'House hand wins — pot wiped. Bank unchanged.',
      kind: 'lose',
    });
    setPhase('result');
    setBusy(false);
  };

  const bankIt = () => {
    const applied = settleRound({
      game: 'blackjack',
      delta: Math.round(potRef.current),
      detail: 'Banked the pot',
      result: 'win',
    });
    setBanner({
      text: applied > 0 ? `Banked +${applied}m` : 'Kept — daily keep cap full.',
      kind: 'win',
    });
    setPhase('result');
  };

  const letItRide = () => {
    const doubled = Math.round(potRef.current * 2);
    setPot(doubled);
    potRef.current = doubled;
    void beginRound(doubled);
  };

  return (
    <div className="screen game-stage bj-screen">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={busy && phase !== 'result'}>
          <ArrowLeft size={16} /> Play
        </button>
        <div className="bj-balance">
          <span>Minutes left</span>
          <strong>{remaining}m</strong>
        </div>
      </div>

      {phase === 'ready' ? (
        <CommitSlider
          value={state.commitMinutes}
          onChange={setCommitMinutes}
          remaining={remaining}
        />
      ) : (
        <PotTicker pot={pot || base} earnLeft={earnLeftToday} commit={commit} />
      )}

      <div className="bj-table">
        <div className="bj-hand">
          <span className="hand-label">House · {dealer.length ? handLabel(dealer) : '—'}</span>
          <div className="bj-cards">
            {dealer.map((c) => (
              <CardView key={c.id} card={c} />
            ))}
          </div>
        </div>
        <div className="bj-hand">
          <span className="hand-label">You · {player.length ? handLabel(player) : '—'}</span>
          <div className="bj-cards">
            {player.map((c) => (
              <CardView key={c.id} card={c} />
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
        <p className="rl-hint">Win to grow the pot. Bank it — or go again to double.</p>
        <div className="bj-actions wrap">
          {phase === 'ready' || phase === 'result' ? (
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => void beginRound()}
              disabled={busy}
            >
              {phase === 'result' ? 'Play again' : 'Start'}
            </button>
          ) : phase === 'ride' ? (
            <>
              <button type="button" className="btn btn-gold" onClick={bankIt}>
                Bank it ({Math.round(pot)}m)
              </button>
              <button type="button" className="btn btn-primary" onClick={letItRide}>
                Go again (×2)
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => void hit()} disabled={busy}>
                Draw
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void stand()} disabled={busy}>
                Hold
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
