import { useMemo, useState } from 'react';
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

function CardFace({ card, dimmed = false }: { card: BusCard | null; dimmed?: boolean }) {
  if (!card) {
    return <div className="bus-card bus-card-back" aria-hidden />;
  }
  const red = busIsRed(card);
  return (
    <div className={`bus-card ${red ? 'red' : ''} ${dimmed ? 'dim' : ''}`}>
      <span className="bus-rank">{busRankLabel(card.rank)}</span>
      <span className="bus-suit">{card.suit}</span>
    </div>
  );
}

export function RideBusGame({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound, state, setWagerMinutes } = useScreel();
  const [phase, setPhase] = useState<Phase>('ready');
  const [deck, setDeck] = useState<BusCard[]>([]);
  const [cards, setCards] = useState<(BusCard | null)[]>([null, null, null, null]);
  const [round, setRound] = useState(0);
  const [pathOdds, setPathOdds] = useState(1);
  const [stake, setStake] = useState(0);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const activeStake = stake || Math.min(state.wagerMinutes, remaining);
  const pot = round > 0 ? fairNet(activeStake, pathOdds) : 0;

  const colorOdds = useMemo(
    () => ({
      red: busColorChance(deck, 'red'),
      black: busColorChance(deck, 'black'),
    }),
    [deck],
  );
  const hiloOdds = useMemo(() => {
    if (!cards[0]) return { higher: 0, lower: 0 };
    return {
      higher: busHiloChance(deck, cards[0], 'higher'),
      lower: busHiloChance(deck, cards[0], 'lower'),
    };
  }, [deck, cards]);
  const rangeOdds = useMemo(() => {
    if (!cards[0] || !cards[1]) return { inside: 0, outside: 0 };
    return {
      inside: busRangeChance(deck, cards[0], cards[1], 'inside'),
      outside: busRangeChance(deck, cards[0], cards[1], 'outside'),
    };
  }, [deck, cards]);
  const suitOdds = useMemo(() => {
    const map = {} as Record<BusSuit, number>;
    for (const s of BUS_SUITS) map[s] = busSuitChance(deck, s);
    return map;
  }, [deck]);

  const start = () => {
    if (remaining < 1) {
      setBanner({ text: 'No minutes available to stake.', kind: 'lose' });
      return;
    }
    const nextStake = Math.min(state.wagerMinutes, remaining);
    setStake(nextStake);
    setDeck(shuffleBusDeck(createBusDeck()));
    setCards([null, null, null, null]);
    setRound(0);
    setPathOdds(1);
    setBanner(null);
    setPhase('color');
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
    setCards([card, null, null, null]);
    const won = color === 'red' ? busIsRed(card) : !busIsRed(card);
    const label = `${busRankLabel(card.rank)}${card.suit}`;
    if (!won) {
      lose(`Color miss · ${label}`, `${label} missed color`);
      return;
    }
    winRound(chance, 1, ROUND_AFTER.color, `${label} · color hit`);
  };

  const pickHilo = (dir: BusHilo) => {
    if (phase !== 'hilo' || busy || !cards[0] || deck.length === 0) return;
    setBusy(true);
    const chance = busHiloChance(deck, cards[0], dir);
    const { card, rest } = drawBusCard(deck);
    setDeck(rest);
    setCards([cards[0], card, null, null]);
    const won = busHiloMatches(cards[0], card, dir);
    const label = `${busRankLabel(card.rank)}${card.suit}`;
    if (!won) {
      lose(`Higher/lower miss · ${label}`, `${label} missed`);
      return;
    }
    winRound(pathOdds * chance, 2, ROUND_AFTER.hilo, `${label} · ${dir} hit`);
  };

  const pickRange = (dir: BusRange) => {
    if (phase !== 'range' || busy || !cards[0] || !cards[1] || deck.length === 0) return;
    setBusy(true);
    const chance = busRangeChance(deck, cards[0], cards[1], dir);
    const { card, rest } = drawBusCard(deck);
    setDeck(rest);
    setCards([cards[0], cards[1], card, null]);
    const won = busRangeMatches(cards[0], cards[1], card, dir);
    const label = `${busRankLabel(card.rank)}${card.suit}`;
    if (!won) {
      lose(`Inside/outside miss · ${label}`, `${label} missed`);
      return;
    }
    winRound(pathOdds * chance, 3, ROUND_AFTER.range, `${label} · ${dir} hit`);
  };

  const pickSuit = (suit: BusSuit) => {
    if (phase !== 'suit' || busy || deck.length === 0) return;
    setBusy(true);
    const chance = busSuitChance(deck, suit);
    const { card, rest } = drawBusCard(deck);
    setDeck(rest);
    setCards([cards[0], cards[1], cards[2], card]);
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
  };

  const setupLocked = phase !== 'ready' && phase !== 'done';

  const pct = (n: number) => `${Math.round(n * 100)}%`;

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
                Red · {pct(colorOdds.red)}
              </button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => pickColor('black')}>
                Black · {pct(colorOdds.black)}
              </button>
            </div>
          ) : null}

          {phase === 'hilo' ? (
            <div className="bj-actions wrap">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => pickHilo('higher')}>
                Higher · {pct(hiloOdds.higher)}
              </button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => pickHilo('lower')}>
                Lower · {pct(hiloOdds.lower)}
              </button>
            </div>
          ) : null}

          {phase === 'range' ? (
            <div className="bj-actions wrap">
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => pickRange('inside')}>
                Inside · {pct(rangeOdds.inside)}
              </button>
              <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => pickRange('outside')}>
                Outside · {pct(rangeOdds.outside)}
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
                  <span>{pct(suitOdds[suit])}</span>
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
            <CardFace card={cards[i]} />
          </div>
        ))}
      </div>

      <div className="bus-hint">
        {phase === 'ready' && (
          <span>
            <Bus size={14} /> Four stops. Odds update from the remaining deck.
          </span>
        )}
        {phase === 'color' && 'Guess red or black for the first card.'}
        {phase === 'hilo' && 'Higher includes equals (Schedule One rule).'}
        {phase === 'range' && 'Inside = strictly between your first two ranks.'}
        {phase === 'suit' && 'Pick the suit — unused suits are slightly better.'}
        {phase === 'choice' && 'Bank now, or risk it for the next stop.'}
        {phase === 'done' && 'Ride over.'}
      </div>
    </GameChrome>
  );
}
