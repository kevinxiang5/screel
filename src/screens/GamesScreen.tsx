import { motion } from 'framer-motion';
import type { GameId } from '../types';
import { AdRescueCard } from '../components/AdRescue';
import { BlackjackTable } from './BlackjackTable';
import { CrashGame } from './CrashGame';
import { DiceGame } from './DiceGame';
import { HiLoGame } from './HiLoGame';
import { MinesGame } from './MinesGame';
import { RouletteTable } from './RouletteTable';
import { SlotsGame } from './SlotsGame';

export function GamesScreen({
  activeGame,
  onSelect,
  onBack,
}: {
  activeGame: GameId;
  onSelect: (game: GameId) => void;
  onBack: () => void;
}) {
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
        <div className="eyebrow">The floor</div>
        <h1 className="display lg">Pick your poison</h1>
        <p className="lede">Every chip is a minute of simulated play. No real money.</p>
      </motion.div>

      <div className="section">
        <AdRescueCard />
      </div>

      <div className="section" style={{ display: 'grid', gap: 14 }}>
        <button type="button" className="game-card featured bj" onClick={() => onSelect('blackjack')}>
          <span className="badge">Classic</span>
          <h3>Blackjack</h3>
          <p>Hit 21. Blackjack pays 3:2. Push keeps your minutes.</p>
        </button>
        <button type="button" className="game-card featured rl" onClick={() => onSelect('roulette')}>
          <span className="badge">High risk</span>
          <h3>Roulette</h3>
          <p>Even-money colors, dozen bets, or a wild single number.</p>
        </button>

        <div className="grid-2">
          <button type="button" className="game-card mines" onClick={() => onSelect('mines')}>
            <span className="badge">Nerve test</span>
            <h3>Mines</h3>
            <p>Dodge the bombs. Cash out before you blow.</p>
          </button>
          <button type="button" className="game-card crash" onClick={() => onSelect('crash')}>
            <span className="badge">Live mult</span>
            <h3>Crash</h3>
            <p>Ride the rocket. Eject before it pops.</p>
          </button>
          <button type="button" className="game-card slots" onClick={() => onSelect('slots')}>
            <span className="badge">×150 max</span>
            <h3>Slots</h3>
            <p>Three reels. Triples pay the big lines.</p>
          </button>
          <button type="button" className="game-card hilo" onClick={() => onSelect('hilo')}>
            <span className="badge">Streaks</span>
            <h3>Hi-Lo</h3>
            <p>Call each card higher or lower. Stack the mult.</p>
          </button>
          <button type="button" className="game-card dice" onClick={() => onSelect('dice')}>
            <span className="badge">Pick odds</span>
            <h3>Dice</h3>
            <p>Set your own win chance. Roll under the line.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
