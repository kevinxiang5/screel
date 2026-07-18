import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { WagerSelector } from '../components/WagerSelector';
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

const MAX_RIDES = 3;

export function BlackjackTable({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound, consumeChallenge, state, setWagerMinutes } = useScreel();
  const [phase, setPhase] = useState<Phase>('ready');
  const [shoe, setShoe] = useState<Card[]>(() => createShoe());
  const [dealer, setDealer] = useState<Card[]>([]);
  const [player, setPlayer] = useState<Card[]>([]);
  const [pot, setPot] = useState(0);
  const [rides, setRides] = useState(0);
  const [canDouble, setCanDouble] = useState(false);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' | 'push' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dealSpeed, setDealSpeed] = useState<'quick' | 'cinematic'>('cinematic');
  const shoeRef = useRef(shoe);
  const potRef = useRef(0);
  const stakeRef = useRef(0);
  const ridesRef = useRef(0);
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
    setCanDouble(false);
    setPhase('playing');

    if (ridePot == null) {
      if (remaining < 1) {
        setBanner({ text: 'No minutes available to stake.', kind: 'lose' });
        setPhase('result');
        setBusy(false);
        return;
      }
      if (!consumeChallenge()) {
        setBanner({ text: 'Daily challenges used — refill from the Play screen.', kind: 'lose' });
        setPhase('result');
        setBusy(false);
        return;
      }
      const stake = Math.min(state.wagerMinutes, remaining);
      stakeRef.current = stake;
      const b = seedPot('blackjack', stake);
      setPot(b);
      potRef.current = b;
      setRides(0);
      ridesRef.current = 0;
    } else {
      setPot(ridePot);
      potRef.current = ridePot;
    }

    const p1 = pull();
    const d1 = pull();
    const p2 = pull();
    const d2 = { ...pull(), hidden: true };
    setPlayer([p1]);
    const dealDelay = dealSpeed === 'quick' ? 90 : 200;
    await sleep(dealDelay);
    setDealer([d1]);
    await sleep(dealDelay);
    setPlayer([p1, p2]);
    await sleep(dealDelay);
    setDealer([d1, d2]);

    if (isBlackjack([p1, p2])) {
      await finish([p1, p2], [d1, { ...d2, hidden: false }], true);
      return;
    }
    setCanDouble(true);
    setBusy(false);
  };

  const hit = async () => {
    if (busy || phase !== 'playing') return;
    setBusy(true);
    setCanDouble(false);
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
    setCanDouble(false);
    await finish(player, dealer, false);
  };

  /** Double the pot, take exactly one more card, then hold. */
  const doubleDown = async () => {
    if (busy || phase !== 'playing' || !canDouble || player.length !== 2) return;
    setBusy(true);
    setCanDouble(false);
    const doubled = Math.round(potRef.current * 2);
    setPot(doubled);
    potRef.current = doubled;
    const next = [...player, pull()];
    setPlayer(next);
    await sleep(280);
    await finish(next, dealer, false);
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

    if (natural && isBlackjack(dCards)) {
      result = 'push';
    } else if (natural) {
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
        text: result === 'blackjack' ? `Natural 21! Payout ${amount}m` : `You win · payout ${amount}m`,
        kind: 'win',
      });
      setPhase('ride');
      setBusy(false);
      return;
    }

    if (result === 'push') {
      settleRound({
        game: 'blackjack',
        pot: 0,
        kept: false,
        wager: stakeRef.current,
        detail: `${handLabel(pCards)} vs ${handLabel(dCards)} · push`,
        result: 'push',
      });
      setBanner({ text: 'Push — no minutes won or lost.', kind: 'push' });
      setPhase('result');
      setBusy(false);
      return;
    }

    settleRound({
      game: 'blackjack',
      pot: 0,
      kept: false,
      wager: stakeRef.current,
      detail: `${handLabel(pCards)} vs ${handLabel(dCards)}`,
      result: 'lose',
    });
    setBanner({ text: `House hand wins · lost ${stakeRef.current}m`, kind: 'lose' });
    setPhase('result');
    setBusy(false);
  };

  const bankIt = () => {
    const applied = settleRound({
      game: 'blackjack',
      pot: Math.round(potRef.current),
      kept: true,
      wager: stakeRef.current,
      detail: 'Banked the pot',
      result: 'win',
    });
    setBanner({ text: `Won +${applied}m`, kind: 'win' });
    setPhase('result');
  };

  const letItRide = () => {
    if (ridesRef.current >= MAX_RIDES) {
      bankIt();
      return;
    }
    const doubled = Math.round(potRef.current * 2);
    setPot(doubled);
    potRef.current = doubled;
    ridesRef.current += 1;
    setRides(ridesRef.current);
    void beginRound(doubled);
  };

  const ridesLeft = Math.max(0, MAX_RIDES - rides);

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

      {(phase === 'ready' || phase === 'result') && (
        <WagerSelector value={state.wagerMinutes} remaining={remaining} onChange={setWagerMinutes} />
      )}

      {(phase === 'ready' || phase === 'result') && (
        <div className="option-strip">
          <span className="hand-label">Deal speed</span>
          <button type="button" className={dealSpeed === 'quick' ? 'active' : ''} onClick={() => setDealSpeed('quick')}>
            Quick
          </button>
          <button type="button" className={dealSpeed === 'cinematic' ? 'active' : ''} onClick={() => setDealSpeed('cinematic')}>
            Cinematic
          </button>
        </div>
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
        <p className="rl-hint">
          {phase === 'playing'
            ? canDouble
              ? 'Double doubles the payout and draws one card — then you hold.'
              : 'Draw or hold. Win to bank or go again.'
            : phase === 'ride'
              ? ridesLeft > 0
                ? `Bank it, or go again to double (${ridesLeft} double${ridesLeft === 1 ? '' : 's'} left).`
                : 'Max doubles reached — bank your payout.'
              : 'Win to grow the payout. Double on your first two cards, or go again after a win.'}
        </p>
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
              {ridesLeft > 0 && (
                <button type="button" className="btn btn-primary" onClick={letItRide}>
                  Go again (×2)
                </button>
              )}
            </>
          ) : phase === 'playing' ? (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => void hit()} disabled={busy}>
                Draw
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void stand()} disabled={busy}>
                Hold
              </button>
              {canDouble && (
                <button type="button" className="btn btn-gold" onClick={() => void doubleDown()} disabled={busy}>
                  Double ({Math.round(pot * 2)}m)
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
