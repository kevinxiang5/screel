import { motion } from 'framer-motion';
import { Bomb, Cherry, Dices, Layers, Rocket, Spade, Target } from 'lucide-react';
import type { GameKind } from '../types';
import { GAME_EARN_DAILY_CAP } from '../types';
import { useScreel } from '../context/ScreelContext';

const GAME_META: Record<GameKind, { label: string; icon: typeof Spade }> = {
  blackjack: { label: 'Blackjack', icon: Spade },
  roulette: { label: 'Color spin', icon: Target },
  mines: { label: 'Safe tiles', icon: Bomb },
  crash: { label: 'Timing run', icon: Rocket },
  slots: { label: 'Match three', icon: Cherry },
  hilo: { label: 'Higher / lower', icon: Layers },
  dice: { label: 'Roll under', icon: Dices },
};

export function StatsScreen() {
  const { state } = useScreel();
  const wins = state.history.filter((h) => h.reward > 0 || h.result === 'win' || h.result === 'blackjack');
  const winRate =
    state.history.length === 0 ? 0 : Math.round((wins.length / state.history.length) * 100);

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Progress</div>
        <h1 className="display lg">Your run</h1>
        <p className="lede">Minutes earned from challenges — never taken by a loss.</p>
      </motion.div>

      <div className="grid-2 section">
        <div className="stat-tile">
          <div className="label">Earned (lifetime)</div>
          <div className="value" style={{ color: 'var(--lime)' }}>
            +{state.totalWon}m
          </div>
        </div>
        <div className="stat-tile">
          <div className="label">Win rate</div>
          <div className="value">{winRate}%</div>
        </div>
        <div className="stat-tile">
          <div className="label">Earned today</div>
          <div className="value">
            {state.minutesEarnedToday}/{GAME_EARN_DAILY_CAP}m
          </div>
        </div>
        <div className="stat-tile">
          <div className="label">Best single earn</div>
          <div className="value">+{state.biggestWin}m</div>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Recent challenges</h2>
        </div>
        {state.history.length === 0 ? (
          <div className="empty">No rounds yet. Open Play and clear a challenge.</div>
        ) : (
          state.history.map((h) => {
            const meta = GAME_META[h.game] ?? GAME_META.blackjack;
            const Icon = meta.icon;
            return (
              <div className="history-item" key={h.id}>
                <div className="history-icon">
                  <Icon size={18} />
                </div>
                <div>
                  <h4>{meta.label}</h4>
                  <p>
                    {h.detail} ·{' '}
                    {new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className={`delta ${h.reward > 0 ? 'up' : 'down'}`}>
                  {h.reward > 0 ? `+${h.reward}m` : '—'}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
