import { useState } from 'react';
import { Bus } from 'lucide-react';
import { GameChrome } from '../components/GameChrome';
import { WagerSelector } from '../components/WagerSelector';
import { useScreel } from '../context/ScreelContext';
import { fairNet } from '../utils/potMath';
import {
  BUS_SUITS,
  busColorChance,
  busHiloChance,
  busHiloMatches,
  busIsRed,
  busRangeChance,
  busRangeMatches,
  busRankLabel,
  busSuitChance,
  createBusDeck,
  drawBusCard,
  shuffleBusDeck,
  type BusCard,
  type BusColor,
  type BusHilo,
  type BusRange,
  type BusSuit,
} from '../utils/rideBus';

type Phase = 'ready' | 'color' | 'hilo' | 'range' | 'suit' | 'choice' | 'done';

const ROUND_AFTER: Record<'color' | 'hilo' | 'range', Phase> = {
  color: 'choice',
  hilo: 'choice',
  range: 'choice',
};

const NEXT_ROUND: Record<number, Phase> = {
  1: 'hilo',
  2: 'range',
  3: 'suit',
};

const FLIP_MS = 420;

function CardFace({
  card,
  flipping = false,
}: {
  card: BusCard | null;
  flipping?: boolean;
}) {
  const showFace = Boolean(card) && !flipping;
  const red = card ? busIsRed(card) : false;

  return (
    <div className={`bus-card-scene ${flipping ? 'flipping' : ''} ${showFace ? 'face-up' : 'face-down'}`}>
      <div className="bus-card-flip">
        <div className="bus-card-face bus-card-back-face" aria-hidden />
        <div className={`bus-card-face bus-card-front-face ${red ? 'red' : ''}`}>
          {card ? (
            <>
              <span className="bus-rank">{busRankLabel(card.rank)}</span>
              <span className="bus-suit">{card.suit}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function RideBusGame({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound, state, setWagerMinutes } = useScreel();
  const [phase, setPhase] = useState<Phase>('ready');
  const [deck, setDeck] = useState<BusCard[]>([]);
  const [cards, setCards] = useState<(BusCard | null)[]>([null, null, null, null]);
  const [flippingSlot, setFlippingSlot] = useState<number | null>(null);
  const [round, setRound] = useState(0);
  const [pathOdds, setPathOdds] = useState(1);
  const [stake, setStake] = useState(0);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const activeStake = stake || Math.min(state.wagerMinutes, remaining);
  const pot = round > 0 ? fairNet(activeStake, pathOdds) : 0;

  const start = () => {
    if (remaining < 1) {
      setBanner({ text: 'No minutes available to stake.', kind: 'lose' });
      return;
    }
    const nextStake = Math.min(state.wagerMinutes, remaining);
    setStake(nextStake);
    setDeck(shuffleBusDeck(createBusDeck()));
    setCards([null, null, null, null]);
    setFlippingSlot(null);
    setRound(0);
    setPathOdds(1);
    setBanner(null);
    setPhase('color');
  };

  const revealCard = (slot: number, card: BusCard, onDone: () => void) => {
    setFlippingSlot(slot);
    setCards((prev) => {
      const next = [...prev] as (BusCard | null)[];
      next[slot] = card;
      return next;
    });
    window.setTimeout(() => {
      setFlippingSlot(null);
      onDone();
    }, FLIP_MS);
  };

  const lose = (detail: string, shown: string) => {
    settleRound({
      game: 'ridethebus',
      pot: 0,
      kept: false,
      wager: stake,
      detail,
      result: 'lose',
    });
    setBanner({ text: `${shown} · lost ${stake}m`, kind: 'lose' });
    setPhase('done');
    setBusy(false);
  };

  const winRound = (nextOdds: number, nextRound: number, nextPhase: Phase, msg: string) => {
    setPathOdds(nextOdds);
    setRound(nextRound);
    setBanner({ text: msg, kind: 'win' });
    setPhase(nextPhase);
    setBusy(false);
  };

  const bankIt = () => {
    if (phase !== 'choice' || round < 1) return;
    const amount = fairNet(stake, pathOdds);
    const applied = settleRound({
      game: 'ridethebus',
      pot: amount,
      kept: true,
      wager: stake,
      detail: `Banked after round ${round}`,
      result: 'win',
    });
    setBanner({ text: `Cashed out · +${applied}m`, kind: 'win' });
    setPhase('done');
  };

  const continueRide = () => {
    if (phase !== 'choice') return;
    setBanner(null);
    setPhase(NEXT_ROUND[round] ?? 'done');
  };

  const pickColor = (color: BusColor) => {
    if (phase !== 'color' || busy || deck.length === 0) return;
    setBusy(true);
    const chance = busColorChance(deck, color);
    const { card, rest } = drawBusCard(deck);
    setDeck(rest);
    revealCard(0, card, () => {
      const won = color === 'red' ? busIsRed(card) : !busIsRed(card);
      const label = `${busRankLabel(card.rank)}${card.suit}`;
      if (!won) {
        lose(`Color miss · ${label}`, `${label} missed color`);
        return;
      }
      winRound(chance, 1, ROUND_AFTER.color, `${label} · color hit`);
    });
  };

  const pickHilo = (dir: BusHilo) => {
    if (phase !== 'hilo' || busy || !cards[0] || deck.length === 0) return;
    setBusy(true);
    const chance = busHiloChance(deck, cards[0], dir);
    const { card, rest } = drawBusCard(deck);
    setDeck(rest);
    revealCard(1, card, () => {
      const won = busHiloMatches(cards[0]!, card, dir);
      const label = `${busRankLabel(card.rank)}${card.suit}`;
      if (!won) {
        lose(`Higher/lower miss · ${label}`, `${label} missed`);
        return;
      }
      winRound(pathOdds * chance, 2, ROUND_AFTER.hilo, `${label} · ${dir} hit`);
    });
  };

  const pickRange = (dir: BusRange) => {
    if (phase !== 'range' || busy || !cards[0] || !cards[1] || deck.length === 0) return;
    setBusy(true);
    const chance = busRangeChance(deck, cards[0], cards[1], dir);
    const { card, rest } = drawBusCard(deck);
    setDeck(rest);
    revealCard(2, card, () => {
      const won = busRangeMatches(cards[0]!, cards[1]!, card, dir);
      const label = `${busRankLabel(card.rank)}${card.suit}`;
      if (!won) {
        lose(`Inside/outside miss · ${label}`, `${label} missed`);
        return;
      }
      winRound(pathOdds * chance, 3, ROUND_AFTER.range, `${label} · ${dir} hit`);
    });
  };

  const pickSuit = (suit: BusSuit) => {
    if (phase !== 'suit' || busy || deck.length === 0) return;
    setBusy(true);
    const chance = busSuitChance(deck, suit);
    const { card, rest } = drawBusCard(deck);
    setDeck(rest);
    revealCard(3, card, () => {
      const won = card.suit === suit;
      const label = `${busRankLabel(card.rank)}${card.suit}`;
      if (!won) {
        lose(`Suit miss · ${label}`, `${label} missed suit`);
        return;
      }
      const nextOdds = pathOdds * chance;
      const amount = fairNet(stake, nextOdds);
      const applied = settleRound({
        game: 'ridethebus',
        pot: amount,
        kept: true,
        wager: stake,
        detail: `Cleared all 4 rounds · ${label}`,
        result: 'win',
      });
      setPathOdds(nextOdds);
      setRound(4);
      setBanner({ text: `${label} · full ride · +${applied}m`, kind: 'win' });
      setPhase('done');
      setBusy(false);
    });
  };

  const setupLocked = phase !== 'ready' && phase !== 'done';

  return (
    <GameChrome
      title="Ride the bus"
      onBack={onBack}
      backDisabled={busy && phase !== 'done'}
      banner={banner}
      setup={
        <WagerSelector
          value={state.wagerMinutes}
          remaining={remaining}
          onChange={setWagerMinutes}
          disabled={setupLocked}
        />
      }
      dock={
        <>
          {phase === 'ready' || phase === 'done' ? (
            <button type="button" className="btn btn-primary btn-block" onClick={start}>
              {phase === 'done' ? 'New ride' : 'Start ride'}
            </button>
          ) : null}

          {phase === 'choice' ? (
            <div className="bj-actions wrap">
              <button type="button" className="btn btn-gold" onClick={bankIt}>
                Cash out · +{Math.round(pot)}m
              </button>
              <button type="button" className="btn btn-primary" onClick={continueRide}>
                Keep riding
              </button>
            </div>
          ) : null}

          {phase === 'color' ? (
            <div className="bj-actions wrap">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => pickColor('red')}>
                Red
              </button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => pickColor('black')}>
                Black
              </button>
            </div>
          ) : null}

          {phase === 'hilo' ? (
            <div className="bj-actions wrap">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => pickHilo('higher')}>
                Higher
              </button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => pickHilo('lower')}>
                Lower
              </button>
            </div>
          ) : null}

          {phase === 'range' ? (
            <div className="bj-actions wrap">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => pickRange('inside')}>
                Inside
              </button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => pickRange('outside')}>
                Outside
              </button>
            </div>
          ) : null}

          {phase === 'suit' ? (
            <div className="bus-suit-row">
              {BUS_SUITS.map((suit) => (
                <button
                  key={suit}
                  type="button"
                  className={`btn btn-secondary bus-suit-btn ${suit === '♥' || suit === '♦' ? 'red' : ''}`}
                  disabled={busy}
                  onClick={() => pickSuit(suit)}
                >
                  {suit}
                </button>
              ))}
            </div>
          ) : null}
        </>
      }
    >
      <p className="lede bus-lede">
        Color → higher/lower → inside/outside → suit. Cash out after any win — a miss loses your stake.
      </p>

      <div className="bus-meta">
        <div className="stat-tile">
          <div className="label">Round</div>
          <div className="value">{round === 0 ? '—' : `${round}/4`}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Cash out</div>
          <div className="value">{round === 0 ? '—' : `+${Math.round(pot)}m`}</div>
        </div>
      </div>

      <div className="bus-board">
        {['Color', 'Hi / Lo', 'Range', 'Suit'].map((label, i) => (
          <div key={label} className="bus-slot">
            <span className="hand-label">{label}</span>
            <CardFace card={cards[i]} flipping={flippingSlot === i} />
          </div>
        ))}
      </div>

      <div className="bus-hint">
        {phase === 'ready' && (
          <span>
            <Bus size={14} /> Four stops. Cash out anytime after a hit.
          </span>
        )}
        {phase === 'color' && 'Guess red or black for the first card.'}
        {phase === 'hilo' && 'Higher includes equals (Schedule One rule).'}
        {phase === 'range' && 'Inside = strictly between your first two ranks.'}
        {phase === 'suit' && 'Pick the suit of the last card.'}
        {phase === 'choice' && 'Bank now, or risk it for the next stop.'}
        {phase === 'done' && 'Ride over.'}
      </div>
    </GameChrome>
  );
}
