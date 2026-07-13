import { motion } from 'framer-motion';
import { Spade, Target } from 'lucide-react';
import { useScreel } from '../context/ScreelContext';

export function StatsScreen() {
  const { state } = useScreel();
  const net = state.totalWon - state.totalLost;
  const winRate =
    state.history.length === 0
      ? 0
      : Math.round(
          (state.history.filter((h) => h.result === 'win' || h.result === 'blackjack').length /
            state.history.length) *
            100,
        );

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Ledger</div>
        <h1 className="display lg">Your run</h1>
        <p className="lede">Wins, losses, and every minute that hit the felt.</p>
      </motion.div>

      <div className="grid-2 section">
        <div className="stat-tile">
          <div className="label">Net minutes</div>
          <div className="value" style={{ color: net >= 0 ? 'var(--lime)' : '#ff8a74' }}>
            {net >= 0 ? '+' : ''}
            {net}m
          </div>
        </div>
        <div className="stat-tile">
          <div className="label">Win rate</div>
          <div className="value">{winRate}%</div>
        </div>
        <div className="stat-tile">
          <div className="label">Minutes won</div>
          <div className="value">+{state.totalWon}</div>
        </div>
        <div className="stat-tile">
          <div className="label">Minutes lost</div>
          <div className="value">−{state.totalLost}</div>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Recent action</h2>
        </div>
        {state.history.length === 0 ? (
          <div className="empty">No hands yet. Hit the floor and make some noise.</div>
        ) : (
          state.history.map((h) => {
            const delta = h.payout - h.wager;
            return (
              <div className="history-item" key={h.id}>
                <div className="history-icon">
                  {h.game === 'blackjack' ? <Spade size={18} /> : <Target size={18} />}
                </div>
                <div>
                  <h4>{h.game === 'blackjack' ? 'Blackjack' : 'Roulette'}</h4>
                  <p>
                    {h.detail} · {new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className={`delta ${delta >= 0 ? 'up' : 'down'}`}>
                  {delta >= 0 ? '+' : ''}
                  {delta}m
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
