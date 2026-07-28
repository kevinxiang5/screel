import { AnimatePresence, motion } from 'framer-motion';
import type { GameId } from '../types';
import { GameListMotion } from '../components/GameChrome';
import { BlackjackTable } from './BlackjackTable';
import { CrashGame } from './CrashGame';
import { DiceGame } from './DiceGame';
import { HiLoGame } from './HiLoGame';
import { MinesGame } from './MinesGame';
import { PlinkoGame } from './PlinkoGame';
import { RideBusGame } from './RideBusGame';
import { RouletteTable } from './RouletteTable';
import { SlotsGame } from './SlotsGame';
import { useScreel } from '../context/ScreelContext';

const quickRounds = [
  {
    id: 'plinko' as const,
    className: 'plinko',
    badge: 'drop',
    title: 'Plinko',
    copy: 'Fast drop, immediate result, bigger edge bins.',
  },
  {
    id: 'mines' as const,
    className: 'mines',
    badge: 'ladder',
    title: 'Safe tiles',
    copy: 'Pick your path and cash out before the miss.',
  },
  {
    id: 'crash' as const,
    className: 'crash',
    badge: 'live',
    title: 'Timing run',
    copy: 'Wait for more, or bank before it breaks.',
  },
  {
    id: 'dice' as const,
    className: 'dice',
    badge: 'risk',
    title: 'Roll under',
    copy: 'Set the target yourself and trade safety for payout.',
  },
];

const longerRuns = [
  {
    id: 'ridethebus' as const,
    className: 'bus',
    badge: 'ladder',
    title: 'Ride the bus',
    copy: 'Four stops, more decisions, bigger finish if you stay alive.',
  },
  {
    id: 'hilo' as const,
    className: 'hilo',
    badge: 'chain',
    title: 'Higher / lower',
    copy: 'Correct calls build momentum. Bank between turns.',
  },
  {
    id: 'slots' as const,
    className: 'slots',
    badge: 'match',
    title: 'Match three',
    copy: 'Any pair pays. Push your luck with a double-up respin.',
  },
  {
    id: 'roulette' as const,
    className: 'rl',
    badge: 'stake',
    title: 'Multiplier wheel',
    copy: 'Pick your number, take the spin, and chase a clean hit.',
  },
];

export function GamesScreen({
  activeGame,
  onSelect,
  onBack,
}: {
  activeGame: GameId;
  onSelect: (game: GameId) => void;
  onBack: () => void;
}) {
  const { state } = useScreel();

  return (
    <div className="game-route">
      <AnimatePresence mode="wait" initial={false}>
        {!activeGame && (
          <GameListMotion key="list">
            <motion.div className="play-shell" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div>
              <div className="eyebrow">Challenges</div>
              <h1 className="display lg">Choose your spot</h1>
              <p className="lede">
                Screel works best when Play feels curated, not crowded. Start with one strong pick, then move into
                shorter or riskier rounds.{state.winStreak > 0 ? ` ${state.winStreak} win streak live.` : ''}
              </p>
              </div>

            <div className="play-spotlight">
              <div className="play-feature-grid">
                <button type="button" className="game-card featured bj" onClick={() => onSelect('blackjack')}>
                  <span className="badge">stake</span>
                  <div className="game-card-copy">
                    <h3>Twenty-one</h3>
                    <p>Beat the house hand. Double on your first two cards, or bank a clean quick win.</p>
                  </div>
                </button>
                <button type="button" className="game-card featured bus" onClick={() => onSelect('ridethebus')}>
                  <span className="badge">ladder</span>
                  <div className="game-card-copy">
                    <h3>Ride the bus</h3>
                    <p>Longer sequence, richer suspense. Cash out after every successful stop.</p>
                  </div>
                </button>
              </div>
              <div className="play-spotlight-note">
                <span>Best when you want a full round with a bit of tension.</span>
                <strong>{state.winStreak > 0 ? `${state.winStreak} streak active` : 'Fresh board'}</strong>
              </div>
            </div>

            <section className="shelf">
              <div className="shelf-head">
                <h3>Quick rounds</h3>
                <p>Fastest games to get in, resolve, and bank.</p>
              </div>
              <div className="shelf-row">
                {quickRounds.map((game) => (
                  <button key={game.id} type="button" className={`game-card ${game.className}`} onClick={() => onSelect(game.id)}>
                    <span className="badge">{game.badge}</span>
                    <div className="game-card-copy">
                      <h3>{game.title}</h3>
                      <p>{game.copy}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="shelf">
              <div className="shelf-head">
                <h3>Deeper runs</h3>
                <p>Longer decision chains and slower-burn tension.</p>
              </div>
              <div className="shelf-row">
                {longerRuns.map((game) => (
                  <button key={game.id} type="button" className={`game-card ${game.className}`} onClick={() => onSelect(game.id)}>
                    <span className="badge">{game.badge}</span>
                    <div className="game-card-copy">
                      <h3>{game.title}</h3>
                      <p>{game.copy}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
            </motion.div>
          </GameListMotion>
        )}
        {activeGame === 'blackjack' && <BlackjackTable key="blackjack" onBack={onBack} />}
        {activeGame === 'roulette' && <RouletteTable key="roulette" onBack={onBack} />}
        {activeGame === 'mines' && <MinesGame key="mines" onBack={onBack} />}
        {activeGame === 'crash' && <CrashGame key="crash" onBack={onBack} />}
        {activeGame === 'slots' && <SlotsGame key="slots" onBack={onBack} />}
        {activeGame === 'hilo' && <HiLoGame key="hilo" onBack={onBack} />}
        {activeGame === 'dice' && <DiceGame key="dice" onBack={onBack} />}
        {activeGame === 'plinko' && <PlinkoGame key="plinko" onBack={onBack} />}
        {activeGame === 'ridethebus' && <RideBusGame key="ridethebus" onBack={onBack} />}
      </AnimatePresence>
    </div>
  );
}
