import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { RewardBadge } from '../components/RewardBadge';
import { useScreel } from '../context/ScreelContext';
import { GAME_REWARDS } from '../types';
import {
  createShoe,
  draw,
  handLabel,
  handValue,
  isBlackjack,
  isRed,
  type Card,
} from '../utils/blackjack';

type Phase = 'ready' | 'playing' | 'dealer' | 'result';

const REWARD = GAME_REWARDS.blackjack;

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
  const { remaining, earnLeftToday, completeChallenge } = useScreel();
  const [phase, setPhase] = useState<Phase>('ready');
  const [shoe, setShoe] = useState<Card[]>(() => createShoe());
  const [dealer, setDealer] = useState<Card[]>([]);
  const [player, setPlayer] = useState<Card[]>([]);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' | 'push' } | null>(null);
  const [busy, setBusy] = useState(false);
  const shoeRef = useRef(shoe);
  shoeRef.current = shoe;

  const pull = () => {
    const r = draw(shoeRef.current);
    shoeRef.current = r.shoe;
    setShoe(r.shoe);
    return r.card;
  };

  const deal = async () => {
    if (busy || phase !== 'ready') return;
    setBusy(true);
    setBanner(null);
    setDealer([]);
    setPlayer([]);
    setPhase('playing');

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
    let text: string;

    if (natural) {
      success = true;
      result = 'blackjack';
      text = `Blackjack! +${Math.min(REWARD, earnLeftToday)}m`;
    } else if (pv > 21) {
      text = 'Bust — no minutes this round.';
    } else if (dv > 21 || pv > dv) {
      success = true;
      result = 'win';
      text = `You win · +${Math.min(REWARD, earnLeftToday)}m`;
    } else if (pv === dv) {
      result = 'push';
      text = 'Push — try again for the reward.';
    } else {
      text = 'Dealer wins — bank unchanged.';
    }

    const awarded = completeChallenge({
      game: 'blackjack',
      success,
      result,
      detail: `${handLabel(pCards)} vs ${handLabel(dCards)}`,
      reward: REWARD,
    });

    if (success && awarded === 0) text = 'You won, but today’s earn cap is full.';
    else if (success) text = result === 'blackjack' ? `Blackjack! +${awarded}m` : `You win · +${awarded}m`;

    setBanner({ text, kind: success ? 'win' : result === 'push' ? 'push' : 'lose' });
    setPhase('result');
    setBusy(false);
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

      <RewardBadge reward={REWARD} earnLeft={earnLeftToday} />

      <div className="bj-table">
        <div className="bj-hand">
          <span className="hand-label">Dealer · {dealer.length ? handLabel(dealer) : '—'}</span>
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
        <p className="rl-hint">Beat the dealer (21 or under). Win to earn minutes — lose and nothing is taken.</p>
        <div className="bj-actions wrap">
          {phase === 'ready' || phase === 'result' ? (
            <button type="button" className="btn btn-primary btn-block" onClick={() => void deal()} disabled={busy}>
              {phase === 'result' ? 'Play again' : 'Deal'}
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => void hit()} disabled={busy}>
                Hit
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void stand()} disabled={busy}>
                Stand
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
