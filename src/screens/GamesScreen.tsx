import { AnimatePresence, motion } from 'framer-motion';
import type { GameId } from '../types';
import { GameListMotion } from '../components/GameChrome';
import { BlackjackTable } from './BlackjackTable';
import { CrashGame } from './CrashGame';
import { DiceGame } from './DiceGame';
import { HiLoGame } from './HiLoGame';
import { MinesGame } from './MinesGame';
import { PlinkoGame } from './PlinkoGame';
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
  const { state } = useScreel();

  return (
    <div className="game-route">
      <AnimatePresence mode="wait" initial={false}>
        {!activeGame && (
          <GameListMotion key="list">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <div className="eyebrow">Challenges</div>
              <h1 className="display lg">Earn more minutes</h1>
              <p className="lede">
                Choose a minute stake, play the challenge, and bank the payout when you win. A miss subtracts
                your stake.{state.winStreak > 0 ? ` ${state.winStreak} win streak.` : ''}
              </p>
            </motion.div>

            <div className="section" style={{ display: 'grid', gap: 14 }}>
              <button type="button" className="game-card featured bj" onClick={() => onSelect('blackjack')}>
                <span className="badge">stake</span>
                <h3>Twenty-one</h3>
                <p>Beat the house hand. Double on your first two cards — or go again after a win.</p>
              </button>
              <button type="button" className="game-card featured rl" onClick={() => onSelect('roulette')}>
                <span className="badge">stake</span>
                <h3>Multiplier wheel</h3>
                <p>Bet a multiplier (2×–20×). Land it to win — miss and the stake is spent.</p>
              </button>

              <div className="grid-2">
                <button type="button" className="game-card mines" onClick={() => onSelect('mines')}>
                  <span className="badge">ladder</span>
                  <h3>Safe tiles</h3>
                  <p>Choose the hazards. Each safe tile grows your payout.</p>
                </button>
                <button type="button" className="game-card crash" onClick={() => onSelect('crash')}>
                  <span className="badge">live</span>
                  <h3>Timing run</h3>
                  <p>Bank before it pops — your payout scales with ×.</p>
                </button>
                <button type="button" className="game-card plinko" onClick={() => onSelect('plinko')}>
                  <span className="badge">drop</span>
                  <h3>Plinko</h3>
                  <p>Drop the ball through the pegs. Edge bins pay more.</p>
                </button>
                <button type="button" className="game-card slots" onClick={() => onSelect('slots')}>
                  <span className="badge">match</span>
                  <h3>Match three</h3>
                  <p>Any pair wins. Take the payout or try one double-up respin.</p>
                </button>
                <button type="button" className="game-card hilo" onClick={() => onSelect('hilo')}>
                  <span className="badge">chain</span>
                  <h3>Higher / lower</h3>
                  <p>Correct calls grow your payout. Bank between calls.</p>
                </button>
                <button type="button" className="game-card dice" onClick={() => onSelect('dice')}>
                  <span className="badge">risk</span>
                  <h3>Roll under</h3>
                  <p>Set your own target. Harder roll, bigger payout.</p>
                </button>
              </div>
            </div>
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
      </AnimatePresence>
    </div>
  );
}
