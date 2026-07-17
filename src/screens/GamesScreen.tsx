import { motion } from 'framer-motion';
import type { GameId } from '../types';
import { GAME_REWARDS } from '../types';
import { AdRescueCard } from '../components/AdRescue';
import { BlackjackTable } from './BlackjackTable';
import { CrashGame } from './CrashGame';
import { DiceGame } from './DiceGame';
import { HiLoGame } from './HiLoGame';
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
  const { earnLeftToday } = useScreel();

  if (activeGame === 'blackjack') return <BlackjackTable onBack={onBack} />;
  if (activeGame === 'roulette') return <RouletteTable onBack={onBack} />;
  if (activeGame === 'mines') return <MinesGame onBack={onBack} />;
  if (activeGame === 'crash') return <CrashGame onBack={onBack} />;
  if (activeGame === 'slots') return <SlotsGame onBack={onBack} />;
  if (activeGame === 'hilo') return <HiLoGame onBack={onBack} />;
  if (activeGame === 'dice') return <DiceGame onBack={onBack} />;

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Minigames</div>
        <h1 className="display lg">Earn more minutes</h1>
        <p className="lede">
          Clear a challenge to add minutes to today’s allowance. Lose a round and nothing is taken from your
          bank. {earnLeftToday}m still earnable today.
        </p>
      </motion.div>

      <div className="section">
        <AdRescueCard />
      </div>

      <div className="section" style={{ display: 'grid', gap: 14 }}>
        <button type="button" className="game-card featured bj" onClick={() => onSelect('blackjack')}>
          <span className="badge">+{GAME_REWARDS.blackjack}m</span>
          <h3>Blackjack</h3>
          <p>Beat the dealer under 21. Win the hand to earn minutes.</p>
        </button>
        <button type="button" className="game-card featured rl" onClick={() => onSelect('roulette')}>
          <span className="badge">+{GAME_REWARDS.roulette}m</span>
          <h3>Color spin</h3>
          <p>Pick a color, spin once. Match it to earn.</p>
        </button>

        <div className="grid-2">
          <button type="button" className="game-card mines" onClick={() => onSelect('mines')}>
            <span className="badge">+{GAME_REWARDS.mines}m</span>
            <h3>Safe tiles</h3>
            <p>Reveal five safe squares. Avoid the mines.</p>
          </button>
          <button type="button" className="game-card crash" onClick={() => onSelect('crash')}>
            <span className="badge">+{GAME_REWARDS.crash}m</span>
            <h3>Timing run</h3>
            <p>Claim at ×1.5 or higher before it pops.</p>
          </button>
          <button type="button" className="game-card slots" onClick={() => onSelect('slots')}>
            <span className="badge">+{GAME_REWARDS.slots}m</span>
            <h3>Match three</h3>
            <p>Any pair or triple earns the reward.</p>
          </button>
          <button type="button" className="game-card hilo" onClick={() => onSelect('hilo')}>
            <span className="badge">+{GAME_REWARDS.hilo}m</span>
            <h3>Higher / lower</h3>
            <p>Three correct calls in a row.</p>
          </button>
          <button type="button" className="game-card dice" onClick={() => onSelect('dice')}>
            <span className="badge">+{GAME_REWARDS.dice}m</span>
            <h3>Roll under</h3>
            <p>Roll under 50 to earn minutes.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
