import { motion } from 'framer-motion';
import type { GameId } from '../types';
import { BlackjackTable } from './BlackjackTable';
import { RouletteTable } from './RouletteTable';

export function GamesScreen({
  activeGame,
  onSelect,
  onBack,
}: {
  activeGame: GameId;
  onSelect: (game: GameId) => void;
  onBack: () => void;
}) {
  if (activeGame === 'blackjack') {
    return <BlackjackTable onBack={onBack} />;
  }
  if (activeGame === 'roulette') {
    return <RouletteTable onBack={onBack} />;
  }

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">The floor</div>
        <h1 className="display lg">Pick your poison</h1>
        <p className="lede">Every chip is a minute of your day. Play sharp.</p>
      </motion.div>

      <div className="section" style={{ display: 'grid', gap: 14 }}>
        <button type="button" className="game-card bj" style={{ minHeight: 200 }} onClick={() => onSelect('blackjack')}>
          <span className="badge">Classic</span>
          <h3 style={{ fontSize: '2rem' }}>Blackjack</h3>
          <p>Hit 21. Blackjack pays 3:2. Push keeps your minutes.</p>
        </button>
        <button type="button" className="game-card rl" style={{ minHeight: 200 }} onClick={() => onSelect('roulette')}>
          <span className="badge">High risk</span>
          <h3 style={{ fontSize: '2rem' }}>Roulette</h3>
          <p>Even-money colors, dozen bets, or a wild single number.</p>
        </button>
      </div>
    </div>
  );
}
