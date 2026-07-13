import { motion } from 'framer-motion';
import { Link2, Link2Off, RefreshCw, Shield } from 'lucide-react';
import { useScreel } from '../context/ScreelContext';

export function BankScreen() {
  const { state, remaining, setBaseLimit, connectScreenTime, disconnectScreenTime, claimChallenge, resetDay } =
    useScreel();

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Minute vault</div>
        <h1 className="display lg">Your bank</h1>
        <p className="lede">
          Link Screen Time, set a daily ceiling, and cash challenge rewards into more playable minutes.
        </p>
      </motion.div>

      <div className="hero-panel" style={{ marginTop: 18 }}>
        <div className="bank-row">
          <div>
            <div className="bank-value">{state.minutesBank}</div>
            <span className="bank-unit">minutes in bank</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="display md" style={{ color: 'var(--lime)' }}>
              {remaining}
            </div>
            <span className="bank-unit">still free</span>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="connect-card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
            <Shield size={22} color="var(--lime)" />
            <div>
              <h3 className="display md" style={{ fontSize: '1.1rem' }}>
                Screen Time link
              </h3>
              <p className="lede" style={{ marginTop: 6 }}>
                {state.connected
                  ? 'Pulling live usage from your device profile (demo sync). Used minutes update your remaining bank.'
                  : 'Connect to import today’s usage. On a real device this hooks into Screen Time / Digital Wellbeing APIs.'}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
            {state.connected ? (
              <button type="button" className="btn btn-secondary btn-block" onClick={disconnectScreenTime}>
                <Link2Off size={16} /> Disconnect
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-block" onClick={connectScreenTime}>
                <Link2 size={16} /> Connect Screen Time
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Daily ceiling</h2>
          <span className="pill gold">{state.baseLimit}m</span>
        </div>
        <div className="limit-control wager-box">
          <label>
            <span>Base allowance</span>
            <strong>{state.baseLimit} min</strong>
          </label>
          <input
            type="range"
            min={15}
            max={240}
            step={5}
            value={state.baseLimit}
            onChange={(e) => setBaseLimit(Number(e.target.value))}
          />
          <p className="lede" style={{ marginTop: 10, fontSize: '0.82rem' }}>
            Wins push the bank above this. Losses carve it down. Reset Day restores the ceiling.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={resetDay}>
          <RefreshCw size={16} /> Reset day · keep streak
        </button>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Claim rewards</h2>
        </div>
        {state.challenges.map((c) => {
          const ready = c.progress >= c.target && !c.claimed;
          return (
            <div className="challenge" key={c.id}>
              <div className="challenge-top">
                <div>
                  <h3>{c.title}</h3>
                  <p>
                    {c.progress}/{c.target} · +{c.reward}m
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-gold"
                  disabled={!ready}
                  onClick={() => claimChallenge(c.id)}
                >
                  {c.claimed ? 'Claimed' : 'Claim'}
                </button>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
