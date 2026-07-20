import { useState } from 'react';
import { Bomb, Gem } from 'lucide-react';
import { GameChrome } from '../components/GameChrome';
import { WagerSelector } from '../components/WagerSelector';
import { useScreel } from '../context/ScreelContext';
import { minesPot } from '../utils/potMath';

const GRID = 25;

type Stage = 'ready' | 'live' | 'done';

function pickMines(count: number): Set<number> {
  const spots = new Set<number>();
  while (spots.size < count) spots.add(Math.floor(Math.random() * GRID));
  return spots;
}

export function MinesGame({ onBack }: { onBack: () => void }) {
  const { remaining, settleRound, state, setWagerMinutes } = useScreel();
  const [stage, setStage] = useState<Stage>('ready');
  const [hazardCount, setHazardCount] = useState(5);
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [stake, setStake] = useState(0);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  const activeStake = stake || Math.min(state.wagerMinutes, remaining);
  const pot = minesPot(activeStake, revealed.size, hazardCount);
  const nextPot = minesPot(activeStake, revealed.size + 1, hazardCount);

  const start = () => {
    if (remaining < 1) {
      setBanner({ text: 'No minutes available to stake.', kind: 'lose' });
      return;
    }
    const nextStake = Math.min(state.wagerMinutes, remaining);
    setStake(nextStake);
    setMines(pickMines(hazardCount));
    setRevealed(new Set());
    setBanner(null);
    setStage('live');
  };

  const bankIt = () => {
    if (stage !== 'live' || revealed.size === 0) return;
    const amount = minesPot(stake, revealed.size, hazardCount);
    const applied = settleRound({
      game: 'mines',
      pot: amount,
      kept: true,
      wager: stake,
      detail: `Banked after ${revealed.size} safe · ${hazardCount} hazards`,
      result: 'win',
    });
    setStage('done');
    setBanner({ text: `Won +${applied}m`, kind: 'win' });
  };

  const reveal = (i: number) => {
    if (stage !== 'live' || revealed.has(i)) return;
    if (mines.has(i)) {
      setStage('done');
      settleRound({
        game: 'mines',
        pot: 0,
        kept: false,
        wager: stake,
        detail: `Hazard after ${revealed.size} safe · ${hazardCount} hazard board`,
        result: 'lose',
      });
      setBanner({ text: `Hazard! Lost ${stake}m.`, kind: 'lose' });
      return;
    }
    const next = new Set(revealed);
    next.add(i);
    setRevealed(next);
  };

  return (
    <GameChrome
      title="Safe tiles"
      className="mines-screen"
      onBack={onBack}
      backDisabled={stage === 'live'}
      banner={banner}
      setup={
        <>
          <WagerSelector
            value={state.wagerMinutes}
            remaining={remaining}
            onChange={setWagerMinutes}
            disabled={stage === 'live'}
          />
          <div className={`option-strip ${stage === 'live' ? 'locked' : ''}`} aria-label="Safe tiles difficulty">
            <span className="hand-label">Hazards</span>
            {[3, 5, 7].map((count) => (
              <button
                type="button"
                key={count}
                className={hazardCount === count ? 'active' : ''}
                disabled={stage === 'live'}
                onClick={() => setHazardCount(count)}
              >
                {count} · {count === 3 ? 'Calm' : count === 5 ? 'Focused' : 'Intense'}
              </button>
            ))}
          </div>
        </>
      }
      dock={
        <>
          {stage === 'live' && (
            <button type="button" className="btn btn-gold btn-block" onClick={bankIt} disabled={revealed.size === 0}>
              Bank it (+{pot}m)
            </button>
          )}
          {(stage === 'ready' || stage === 'done') && (
            <button type="button" className="btn btn-primary btn-block" onClick={start}>
              {stage === 'done' ? 'New board' : 'Start challenge'}
            </button>
          )}
        </>
      }
    >
      <p className="lede mines-lede">
        {hazardCount} hazards in {GRID} tiles — reveal safe spots, bank anytime.
      </p>
      <div className="mines-meta">
        <div className="stat-tile">
          <div className="label">Payout now</div>
          <div className="value">{revealed.size === 0 ? '—' : `+${pot}m`}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Next tile</div>
          <div className="value">+{nextPot}m</div>
        </div>
      </div>
      <div className={`mines-grid ${stage === 'done' ? 'over' : ''}`}>
        {Array.from({ length: GRID }, (_, i) => {
          const isMine = mines.has(i);
          const isOpen = revealed.has(i);
          const showMine = stage === 'done' && isMine;
          const nearMiss = stage === 'done' && !isMine && !isOpen;
          return (
            <button
              key={i}
              type="button"
              className={`mine-tile ${isOpen ? 'safe' : ''} ${showMine ? 'boom' : ''} ${nearMiss ? 'near' : ''}`}
              onClick={() => reveal(i)}
              disabled={stage !== 'live' || isOpen}
            >
              {isOpen ? <Gem size={15} /> : showMine ? <Bomb size={15} /> : ''}
            </button>
          );
        })}
      </div>
    </GameChrome>
  );
}
