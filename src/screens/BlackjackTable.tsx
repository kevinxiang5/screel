import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { ChipTray, StackChip } from '../components/Chips';
import { useScreel } from '../context/ScreelContext';
import { useScreelUI } from '../components/ScreelUI';
import {
  canSplit,
  createShoe,
  draw,
  handLabel,
  handValue,
  isBlackjack,
  isRed,
  type Card,
} from '../utils/blackjack';

type Phase = 'betting' | 'dealing' | 'insurance' | 'playing' | 'dealer' | 'result';

interface Hand {
  cards: Card[];
  bet: number;
  fromSplit: boolean;
  doubled: boolean;
  finished: boolean;
}

const DEAL_GAP = 560;
const FLIP_MS = 700;
const HIT_GAP = 600;
const DEALER_HIT = 750;
const RESULT_PAUSE = 550;

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

function CardView({ card, flipping = false }: { card: Card; flipping?: boolean }) {
  const faceDown = Boolean(card.hidden) && !flipping;

  return (
    <div className={`pcard-scene ${flipping ? 'is-flipping' : ''}`}>
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
  const { remaining, settleRound, state } = useScreel();
  const { toast, confirm } = useScreelUI();
  const [phase, setPhase] = useState<Phase>('betting');
  const [chip, setChip] = useState(5);
  const [bet, setBet] = useState(0);
  const [lastBet, setLastBet] = useState(0);
  const [shoe, setShoe] = useState<Card[]>(() => createShoe());
  const [dealer, setDealer] = useState<Card[]>([]);
  const [hands, setHands] = useState<Hand[]>([]);
  const [active, setActive] = useState(0);
  const [insuranceBet, setInsuranceBet] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' | 'push' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [flippingId, setFlippingId] = useState<string | null>(null);
  const settling = useRef(false);
  const shoeRef = useRef(shoe);
  shoeRef.current = shoe;

  const lockedBet = useMemo(() => hands.reduce((s, h) => s + h.bet, 0) + insuranceBet, [hands, insuranceBet]);
  const displayBalance =
    phase === 'betting' || phase === 'result' ? remaining : Math.max(0, remaining - lockedBet);

  const pull = (s: Card[]) => {
    const r = draw(s);
    return { card: r.card, shoe: r.shoe };
  };

  const flipHole = async (cards: Card[]) => {
    const hole = cards.find((c) => c.hidden);
    if (!hole) return cards.map((c) => ({ ...c, hidden: false }));

    setFlippingId(hole.id);
    // Start flip visually while still "hidden" content shows via flipping flag
    await sleep(FLIP_MS);
    const revealed = cards.map((c) => ({ ...c, hidden: false }));
    setDealer(revealed);
    setFlippingId(null);
    await sleep(320);
    return revealed;
  };

  const addChip = () => {
    if (phase !== 'betting' || busy) return;
    if (bet + chip > remaining) return;
    setBet((b) => b + chip);
  };

  const clearBet = () => {
    if (phase !== 'betting' || busy) return;
    setBet(0);
  };

  const rebet = () => {
    if (phase !== 'betting' || busy || lastBet <= 0) return;
    setBet(Math.min(lastBet, remaining));
  };

  const deal = async () => {
    if (phase !== 'betting' || bet < 1 || bet > remaining || busy) return;
    if (state.riskAlerts && bet > remaining * 0.25) {
      const ok = await confirm({
        title: 'High roller risk',
        message: `This wager is over 25% of your bank (${bet}m of ${remaining}m left). Deal anyway?`,
        confirmLabel: 'Deal anyway',
        cancelLabel: 'Pull back',
        tone: 'warn',
      });
      if (!ok) return;
    }

    const mainBet = bet;
    settling.current = false;
    setBusy(true);
    setBanner(null);
    setLastBet(mainBet);
    setInsuranceBet(0);
    setPhase('dealing');
    setDealer([]);
    setHands([]);
    setActive(0);
    setBet(0);

    let s = shoeRef.current.length < 40 ? createShoe() : [...shoeRef.current];
    await sleep(280);

    let t = pull(s);
    s = t.shoe;
    const p1 = t.card;
    setHands([{ cards: [p1], bet: mainBet, fromSplit: false, doubled: false, finished: false }]);
    await sleep(DEAL_GAP);

    t = pull(s);
    s = t.shoe;
    const d1 = t.card;
    setDealer([d1]);
    await sleep(DEAL_GAP);

    t = pull(s);
    s = t.shoe;
    const p2 = t.card;
    const playerHand = [p1, p2];
    setHands([{ cards: playerHand, bet: mainBet, fromSplit: false, doubled: false, finished: false }]);
    await sleep(DEAL_GAP);

    t = pull(s);
    s = t.shoe;
    const d2: Card = { ...t.card, hidden: true };
    const dealerHand = [d1, d2];
    setDealer(dealerHand);
    setShoe(s);
    await sleep(DEAL_GAP + 200);

    const dealerOpen = [d1, { ...d2, hidden: false }];
    const playerBJ = isBlackjack(playerHand);
    const dealerBJ = isBlackjack(dealerOpen);

    if (d1.rank === 'A' && !playerBJ) {
      setPhase('insurance');
      setBusy(false);
      return;
    }

    if (playerBJ || dealerBJ) {
      const revealed = await flipHole(dealerHand);
      await sleep(RESULT_PAUSE);
      await finishHands(
        [{ cards: playerHand, bet: mainBet, fromSplit: false, doubled: false, finished: true }],
        revealed,
        0,
      );
      setBusy(false);
      return;
    }

    setPhase('playing');
    setBusy(false);
  };

  const takeInsurance = (yes: boolean) => {
    if (phase !== 'insurance' || busy) return;
    const main = hands[0]?.bet ?? lastBet;
    const cost = yes ? Math.floor(main / 2) : 0;
    if (yes && main + cost > remaining) {
      toast('Not enough minutes left to cover insurance on this hand.', {
        title: 'Can’t insure',
        tone: 'error',
      });
      return;
    }
    setInsuranceBet(cost);
    void resolveInsurance(cost);
  };

  const resolveInsurance = async (ins: number) => {
    setBusy(true);
    await sleep(350);

    // Peek: flip to check BJ
    const peeked = dealer.map((c) => ({ ...c, hidden: false }));
    const dealerBJ = isBlackjack(peeked);

    if (dealerBJ) {
      const revealed = await flipHole(dealer);
      await sleep(RESULT_PAUSE);
      await finishHands(
        hands.map((h) => ({ ...h, finished: true })),
        revealed,
        ins,
        true,
      );
      setBusy(false);
      return;
    }

    // No BJ — brief flip tease then cover again
    setFlippingId(dealer[1]?.id ?? null);
    await sleep(Math.floor(FLIP_MS * 0.55));
    setFlippingId(null);
    setDealer(dealer.map((c, i) => (i === 1 ? { ...c, hidden: true } : c)));
    await sleep(400);

    setPhase('playing');
    setBusy(false);
  };

  const current = hands[active];

  const hit = async () => {
    if (phase !== 'playing' || !current || current.finished || busy) return;
    setBusy(true);
    const r = pull(shoeRef.current);
    setShoe(r.shoe);
    const cards = [...current.cards, r.card];
    const nextHands = hands.map((h, i) => (i === active ? { ...h, cards } : h));
    setHands(nextHands);
    await sleep(HIT_GAP);

    if (handValue(cards) >= 21) {
      await advanceAfterHand(nextHands, active, true);
    } else {
      setBusy(false);
    }
  };

  const stand = async () => {
    if (phase !== 'playing' || !current || current.finished || busy) return;
    setBusy(true);
    await sleep(280);
    const nextHands = hands.map((h, i) => (i === active ? { ...h, finished: true } : h));
    setHands(nextHands);
    await advanceAfterHand(nextHands, active, true);
  };

  const doubleDown = async () => {
    if (phase !== 'playing' || !current || current.finished || busy) return;
    if (current.cards.length !== 2) return;
    const totalCommitted = hands.reduce((s, h) => s + h.bet, 0) + insuranceBet + current.bet;
    if (totalCommitted > remaining) {
      toast('You need matching minutes free to double this hand.', {
        title: 'Can’t double',
        tone: 'warn',
      });
      return;
    }

    setBusy(true);
    const r = pull(shoeRef.current);
    setShoe(r.shoe);
    const cards = [...current.cards, r.card];
    const nextHands = hands.map((h, i) =>
      i === active ? { ...h, cards, bet: h.bet * 2, doubled: true, finished: true } : h,
    );
    setHands(nextHands);
    await sleep(HIT_GAP + 220);
    await advanceAfterHand(nextHands, active, true);
  };

  const split = async () => {
    if (phase !== 'playing' || !current || current.finished || busy) return;
    if (!canSplit(current.cards) || hands.length >= 2) return;
    const totalCommitted = hands.reduce((s, h) => s + h.bet, 0) + insuranceBet + current.bet;
    if (totalCommitted > remaining) {
      toast('Splitting needs another bet equal to your current hand.', {
        title: 'Can’t split',
        tone: 'warn',
      });
      return;
    }

    setBusy(true);
    let s = [...shoeRef.current];
    const [a, b] = current.cards;

    setHands([
      { cards: [a], bet: current.bet, fromSplit: true, doubled: false, finished: false },
      { cards: [b], bet: current.bet, fromSplit: true, doubled: false, finished: false },
    ]);
    await sleep(DEAL_GAP);

    let t = pull(s);
    s = t.shoe;
    const a2 = t.card;
    setHands([
      { cards: [a, a2], bet: current.bet, fromSplit: true, doubled: false, finished: false },
      { cards: [b], bet: current.bet, fromSplit: true, doubled: false, finished: false },
    ]);
    await sleep(DEAL_GAP);

    t = pull(s);
    s = t.shoe;
    const b2 = t.card;
    const nextHands: Hand[] = [
      { cards: [a, a2], bet: current.bet, fromSplit: true, doubled: false, finished: false },
      { cards: [b, b2], bet: current.bet, fromSplit: true, doubled: false, finished: false },
    ];
    setHands(nextHands);
    setShoe(s);
    setActive(0);
    await sleep(DEAL_GAP);

    if (a.rank === 'A') {
      const done = nextHands.map((h) => ({ ...h, finished: true }));
      setHands(done);
      await sleep(450);
      await playDealerAndSettle(done);
      return;
    }

    setPhase('playing');
    setBusy(false);
  };

  const advanceAfterHand = async (nextHands: Hand[], idx: number, markDone: boolean) => {
    const updated = nextHands.map((h, i) =>
      i === idx && markDone ? { ...h, finished: true } : h,
    );
    const nextIdx = updated.findIndex((h, i) => i > idx && !h.finished);
    if (nextIdx >= 0) {
      setHands(updated);
      setActive(nextIdx);
      setPhase('playing');
      await sleep(400);
      setBusy(false);
      return;
    }
    const earlier = updated.findIndex((h) => !h.finished);
    if (earlier >= 0) {
      setHands(updated);
      setActive(earlier);
      setPhase('playing');
      await sleep(400);
      setBusy(false);
      return;
    }
    setHands(updated);
    await playDealerAndSettle(updated);
  };

  const playDealerAndSettle = async (finalHands: Hand[]) => {
    setPhase('dealer');
    setBusy(true);

    await sleep(450);
    let dCards: Card[] = await flipHole(dealer);
    await sleep(500);

    const allBust = finalHands.every((h) => handValue(h.cards) > 21);
    if (!allBust) {
      let s = [...shoeRef.current];
      while (handValue(dCards) < 17) {
        await sleep(DEALER_HIT);
        const r = pull(s);
        s = r.shoe;
        dCards = [...dCards, { ...r.card, hidden: false }];
        setDealer(dCards);
        setShoe(s);
      }
      await sleep(550);
    } else {
      await sleep(700);
    }

    await finishHands(finalHands, dCards, insuranceBet);
    setBusy(false);
  };

  const finishHands = async (
    finalHands: Hand[],
    dCards: Card[],
    ins: number,
    dealerHadBJ = false,
  ) => {
    if (settling.current) return;
    settling.current = true;
    setPhase('result');
    setDealer(dCards);
    await sleep(RESULT_PAUSE);

    const dVal = handValue(dCards);
    const dBJ = isBlackjack(dCards);
    const totalWager = finalHands.reduce((s, h) => s + h.bet, 0) + ins;
    let totalPayout = 0;
    const notes: string[] = [];

    if (ins > 0) {
      if (dBJ) {
        totalPayout += ins + ins * 2;
        notes.push(`Insurance +${ins * 2}m`);
      } else {
        notes.push('Insurance lost');
      }
    }

    finalHands.forEach((h, i) => {
      const label = finalHands.length > 1 ? `Hand ${i + 1}` : 'Hand';
      const pVal = handValue(h.cards);
      const pBJ = isBlackjack(h.cards) && !h.fromSplit;

      if (dealerHadBJ || dBJ) {
        if (pBJ) {
          totalPayout += h.bet;
          notes.push(`${label}: push BJ`);
        } else {
          notes.push(`${label}: lose to dealer BJ`);
        }
        return;
      }

      if (pVal > 21) {
        notes.push(`${label}: bust`);
        return;
      }
      if (pBJ) {
        const win = Math.floor(h.bet * 1.5);
        totalPayout += h.bet + win;
        notes.push(`${label}: Blackjack +${win}m`);
        return;
      }
      if (dVal > 21 || pVal > dVal) {
        totalPayout += h.bet * 2;
        notes.push(`${label}: win +${h.bet}m`);
      } else if (pVal < dVal) {
        notes.push(`${label}: lose`);
      } else {
        totalPayout += h.bet;
        notes.push(`${label}: push`);
      }
    });

    const net = totalPayout - totalWager;
    const kind: 'win' | 'lose' | 'push' = net > 0 ? 'win' : net < 0 ? 'lose' : 'push';
    const result =
      notes.some((n) => n.includes('Blackjack')) && net > 0
        ? 'blackjack'
        : kind === 'win'
          ? 'win'
          : kind === 'lose'
            ? 'lose'
            : 'push';

    setBanner({
      text: `${net >= 0 ? '+' : ''}${net}m · ${notes.join(' · ')}`,
      kind,
    });

    settleRound({
      game: 'blackjack',
      wager: totalWager,
      payout: totalPayout,
      result,
      detail: notes.join(' · '),
    });
  };

  const nextRound = () => {
    if (busy) return;
    settling.current = false;
    setPhase('betting');
    setDealer([]);
    setHands([]);
    setActive(0);
    setInsuranceBet(0);
    setBanner(null);
    setFlippingId(null);
    setBet((b) => (b > 0 ? b : Math.min(lastBet, remaining)));
  };

  useEffect(() => {
    if (phase === 'betting' && bet > remaining) setBet(remaining);
  }, [remaining, phase, bet]);

  const canAct = phase === 'playing' && !!current && !current.finished && !busy;
  const canDouble =
    canAct &&
    current!.cards.length === 2 &&
    hands.reduce((s, h) => s + h.bet, 0) + insuranceBet + current!.bet <= remaining;
  const canSplitHand =
    canAct &&
    canSplit(current!.cards) &&
    hands.length === 1 &&
    hands.reduce((s, h) => s + h.bet, 0) + insuranceBet + current!.bet <= remaining;

  const showActions = phase === 'playing';

  return (
    <div className="screen game-stage bj-screen">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Floor
        </button>
        <div className="bj-balance">
          <span>Balance</span>
          <strong>{displayBalance}m</strong>
        </div>
      </div>

      <div className="bj-table">
        <div className="bj-rail">Blackjack · pays 3:2 · dealer stands soft 17</div>

        <div className="bj-seat dealer-seat">
          <div className="bj-seat-meta">
            <span>Dealer</span>
            {dealer.length > 0 && phase !== 'dealing' && (
              <motion.span
                className="score-pill"
                key={`${handLabel(dealer)}-${phase}`}
                initial={{ scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                {handLabel(dealer)}
              </motion.span>
            )}
          </div>
          <div className="bj-cards">
            {dealer.map((c) => (
              <CardView key={c.id} card={c} flipping={flippingId === c.id} />
            ))}
          </div>
        </div>

        <div className="bj-bet-zone">
          {phase === 'betting' ? (
            <motion.button
              type="button"
              className="bj-circle"
              onClick={addChip}
              disabled={remaining < 1}
              key={bet}
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            >
              {bet > 0 ? <StackChip amount={bet} /> : <span className="bj-circle-hint">Tap chips below, then here</span>}
              <span className="bj-circle-label">MAIN BET</span>
            </motion.button>
          ) : (
            <div className="bj-live-bets">
              {hands.map((h, i) => (
                <motion.div
                  key={i}
                  className={`bj-live-bet ${i === active && phase === 'playing' ? 'active' : ''}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 16 }}
                >
                  <StackChip amount={h.bet} />
                  <span>Hand {hands.length > 1 ? i + 1 : ''}</span>
                </motion.div>
              ))}
              {insuranceBet > 0 && (
                <div className="bj-live-bet">
                  <StackChip amount={insuranceBet} />
                  <span>Ins</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bj-hands">
          {hands.map((h, i) => (
            <div
              key={i}
              className={`bj-seat player-seat ${i === active && phase === 'playing' ? 'active' : ''}`}
            >
              {h.cards.length > 0 && (
                <div className="bj-seat-meta">
                  <span>{hands.length > 1 ? `You · ${i + 1}` : 'You'}</span>
                  {phase !== 'dealing' && (
                    <motion.span
                      className="score-pill"
                      key={handLabel(h.cards)}
                      initial={{ scale: 0.75, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      {handLabel(h.cards)}
                    </motion.span>
                  )}
                </div>
              )}
              <div className="bj-cards">
                {h.cards.map((c) => (
                  <CardView key={c.id} card={c} />
                ))}
              </div>
            </div>
          ))}
          {hands.length === 0 && phase === 'betting' && (
            <div className="bj-empty-hint">Place a bet to deal</div>
          )}
          {phase === 'dealing' && (
            <motion.div
              className="bj-dealing-tag"
              animate={{ opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1.1, repeat: Infinity }}
            >
              Dealing…
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {banner && (
            <motion.div
              className={`result-banner ${banner.kind}`}
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              {banner.text}
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'insurance' && (
          <motion.div
            className="bj-insurance"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>Dealer shows Ace — Insurance?</p>
            <div className="bj-actions">
              <button type="button" className="btn btn-gold" onClick={() => takeInsurance(true)} disabled={busy}>
                Yes · {Math.floor((hands[0]?.bet ?? 0) / 2)}m
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => takeInsurance(false)} disabled={busy}>
                No
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <div className="bj-dock">
        {phase === 'betting' && (
          <>
            <ChipTray
              selected={chip}
              onSelect={setChip}
              disabled={remaining < 1 || busy}
              values={[1, 2, 5, 10, 25].filter((v) => v <= Math.max(1, remaining))}
            />
            <div className="bj-actions">
              <button type="button" className="btn btn-secondary" onClick={clearBet} disabled={bet < 1 || busy}>
                Clear
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={rebet}
                disabled={lastBet < 1 || remaining < 1 || busy}
              >
                Rebet
              </button>
              <button type="button" className="btn btn-primary" onClick={deal} disabled={bet < 1 || busy}>
                Deal
              </button>
            </div>
          </>
        )}

        {showActions && (
          <div className="bj-actions wrap">
            <button type="button" className="btn btn-secondary" onClick={hit} disabled={!canAct}>
              Hit
            </button>
            <button type="button" className="btn btn-gold" onClick={stand} disabled={!canAct}>
              Stand
            </button>
            <button type="button" className="btn btn-secondary" onClick={doubleDown} disabled={!canDouble}>
              Double
            </button>
            <button type="button" className="btn btn-secondary" onClick={split} disabled={!canSplitHand}>
              Split
            </button>
          </div>
        )}

        {(phase === 'dealing' || phase === 'dealer' || phase === 'result') && (
          <div className="bj-actions">
            {phase === 'result' && !busy ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    nextRound();
                    setBet(Math.min(lastBet, remaining));
                  }}
                  disabled={lastBet < 1 || remaining < 1}
                >
                  Rebet
                </button>
                <button type="button" className="btn btn-primary" onClick={nextRound}>
                  New bet
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-secondary" disabled>
                {phase === 'dealing' ? 'Dealing…' : phase === 'dealer' ? 'Dealer playing…' : 'Settling…'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
