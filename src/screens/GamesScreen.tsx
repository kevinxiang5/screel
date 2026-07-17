import { motion } from 'framer-motion';
import type { GameId } from '../types';
import { GAME_REWARDS } from '../types';
import { BlackjackTable } from './BlackjackTable';
import { CrashGame } from './CrashGame';
import { DiceGame } from './DiceGame';
import { HiLoGame } from './HiLoGame';
import { MathSprint } from './MathSprint';
import { MinesGame } from './MinesGame';
import { RouletteTable } from './RouletteTable';
import { SlotsGame } from './SlotsGame';
import { useScreel } from '../context/ScreelContext';

export function GamesScreen({
  activeGame,
  onSelect,
  onBack,
}: {
  activeGame: GameId;
  onSelect: (game: GameId) => void;
  onBack: () => void;
}) {
  const { earnLeftToday, state } = useScreel();

  if (activeGame === 'blackjack') return <BlackjackTable onBack={onBack} />;
  if (activeGame === 'roulette') return <RouletteTable onBack={onBack} />;
  if (activeGame === 'mines') return <MinesGame onBack={onBack} />;
  if (activeGame === 'crash') return <CrashGame onBack={onBack} />;
  if (activeGame === 'slots') return <SlotsGame onBack={onBack} />;
  if (activeGame === 'hilo') return <HiLoGame onBack={onBack} />;
  if (activeGame === 'dice') return <DiceGame onBack={onBack} />;
  if (activeGame === 'math') return <MathSprint onBack={onBack} />;

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Challenges</div>
        <h1 className="display lg">Earn more minutes</h1>
        <p className="lede">
          Clear a challenge to keep a bonus pot. Push your luck to grow it — miss and the pot is wiped
          (optional commit can miss minutes from today). {earnLeftToday}m still keepable today.
          {state.winStreak > 0 ? ` · ${state.winStreak} keep streak` : ''}
        </p>
      </motion.div>

      <div className="section" style={{ display: 'grid', gap: 14 }}>
        <button type="button" className="game-card featured math" onClick={() => onSelect('math')}>
          <span className="badge">+{GAME_REWARDS.math}m</span>
          <h3>Math sprint</h3>
          <p>Ten quick answers in 30 seconds. Pure skill bonus.</p>
        </button>
        <button type="button" className="game-card featured bj" onClick={() => onSelect('blackjack')}>
          <span className="badge">pot</span>
          <h3>Twenty-one</h3>
          <p>Beat the house hand. Bank the pot — or go again for double.</p>
        </button>
        <button type="button" className="game-card featured rl" onClick={() => onSelect('roulette')}>
          <span className="badge">pot</span>
          <h3>Color spin</h3>
          <p>Pick a color, watch the wheel. Match to grow — bank or double.</p>
        </button>

        <div className="grid-2">
          <button type="button" className="game-card mines" onClick={() => onSelect('mines')}>
            <span className="badge">ladder</span>
            <h3>Safe tiles</h3>
            <p>Reveal tiles to grow the pot. Bank anytime.</p>
          </button>
          <button type="button" className="game-card crash" onClick={() => onSelect('crash')}>
            <span className="badge">live</span>
            <h3>Timing run</h3>
            <p>Bank before it pops — pot scales with ×.</p>
          </button>
          <button type="button" className="game-card slots" onClick={() => onSelect('slots')}>
            <span className="badge">match</span>
            <h3>Match three</h3>
            <p>Any pair grows the pot. One double-up respin.</p>
          </button>
          <button type="button" className="game-card hilo" onClick={() => onSelect('hilo')}>
            <span className="badge">chain</span>
            <h3>Higher / lower</h3>
            <p>Correct calls grow the pot. Bank between.</p>
          </button>
          <button type="button" className="game-card dice" onClick={() => onSelect('dice')}>
            <span className="badge">risk</span>
            <h3>Roll under</h3>
            <p>Set your own target. Harder roll, bigger pot.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
