import { motion } from 'framer-motion';
import { Bomb, Bus, Cherry, Dices, Layers, Rocket, Spade, Target } from 'lucide-react';
import type { GameKind } from '../types';
import { useScreel } from '../context/ScreelContext';

const GAME_META: Record<GameKind, { label: string; icon: typeof Spade }> = {
  blackjack: { label: 'Twenty-one', icon: Spade },
  roulette: { label: 'Multiplier wheel', icon: Target },
  mines: { label: 'Safe tiles', icon: Bomb },
  crash: { label: 'Timing run', icon: Rocket },
  slots: { label: 'Match three', icon: Cherry },
  hilo: { label: 'Higher / lower', icon: Layers },
  dice: { label: 'Roll under', icon: Dices },
  plinko: { label: 'Plinko', icon: Target },
  ridethebus: { label: 'Ride the bus', icon: Bus },
};

export function StatsScreen() {
  const { state } = useScreel();
  const wins = state.history.filter((h) => h.delta > 0 || h.result === 'win' || h.result === 'blackjack');
  const winRate =
    state.history.length === 0 ? 0 : Math.round((wins.length / state.history.length) * 100);
  const net = state.totalWon - state.totalLost;

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Progress</div>
        <h1 className="display lg">Your run</h1>
        <p className="lede">
          See whether your screen-time game is compounding in the right direction.
        </p>
      </motion.div>

      <div className="hero-panel section">
        <div className="stats-hero">
          <div>
            <div className="label">Net minutes kept</div>
            <div className={`stats-hero-value ${net >= 0 ? 'pos' : 'neg'}`}>{net >= 0 ? '+' : ''}{net}m</div>
            <p className="lede" style={{ marginTop: 8 }}>
              {winRate >= 50
                ? 'You are banking more than you burn.'
                : 'The next clean streak can swing the whole run back.'}
            </p>
          </div>
          <div className="stats-hero-side">
            <div className="hero-stat">
              <span className="k">Win rate</span>
              <span className="v">{winRate}%</span>
            </div>
            <div className="hero-stat">
              <span className="k">Streak</span>
              <span className="v">{state.winStreak}</span>
            </div>
            <div className="hero-stat">
              <span className="k">Rounds</span>
              <span className="v">{state.gamesPlayed}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>
            <span className="idx">01</span> Run shape
          </h2>
        </div>
        <div className="grid-2">
          <div className="stat-tile">
            <div className="label">Winnings (lifetime)</div>
            <div className="value" style={{ color: 'var(--lime)' }}>
              +{state.totalWon}m
            </div>
          </div>
          <div className="stat-tile">
            <div className="label">Stake losses</div>
            <div className="value" style={{ color: '#ff8a8a' }}>−{state.totalLost}m</div>
          </div>
          <div className="stat-tile">
            <div className="label">Won today</div>
            <div className="value">+{state.minutesEarnedToday}m</div>
          </div>
          <div className="stat-tile">
            <div className="label">Best win</div>
            <div className="value">+{state.biggestWin}m</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            <span className="idx">02</span> Per-game performance
          </h2>
        </div>
        <div className="game-stats-grid">
          {(Object.keys(GAME_META) as GameKind[]).map((game) => {
            const rows = state.history.filter((entry) => entry.game === game);
            const kept = rows.filter((entry) => entry.result === 'win' || entry.result === 'blackjack');
            const minutes = rows.reduce((sum, entry) => sum + Math.max(0, entry.delta), 0);
            const rate = rows.length ? Math.round((kept.length / rows.length) * 100) : 0;
            return (
              <div className="stat-tile" key={game}>
                <div className="label">{GAME_META[game].label}</div>
                <div className="value">{rate}%</div>
                <p>{rows.length} runs · +{minutes}m kept</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            <span className="idx">03</span> Recent challenges
          </h2>
        </div>
        {state.history.length === 0 ? (
          <div className="empty">No rounds yet. Open Play and clear a challenge.</div>
        ) : (
          state.history.slice(0, 80).map((h) => {
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
                <div className={`delta ${h.delta > 0 ? 'up' : h.delta < 0 ? 'down' : ''}`}>
                  {h.delta > 0 ? `+${h.delta}m` : h.delta < 0 ? `${h.delta}m` : '—'}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
