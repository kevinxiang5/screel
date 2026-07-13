import { motion } from 'framer-motion';
import { useScreel } from '../context/ScreelContext';

export function ProfileScreen() {
  const { state, updateProfile } = useScreel();

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Identity</div>
        <h1 className="display lg">You</h1>
        <p className="lede">Tune the house rules. Stay sharp. Stay playful.</p>
      </motion.div>

      <div className="profile-hero section" style={{ marginTop: 18 }}>
        <div className="avatar">{state.displayName.slice(0, 1).toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div className="label" style={{ fontSize: '0.72rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mute)' }}>
            Display name
          </div>
          <input
            className="name-input"
            value={state.displayName}
            maxLength={20}
            onChange={(e) => updateProfile({ displayName: e.target.value || 'High Roller' })}
          />
          <p className="lede" style={{ marginTop: 8, fontSize: '0.8rem' }}>
            Level {state.level} · {state.xp} XP · {state.streak} day streak
          </p>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>House settings</h2>
        </div>
        <div className="stat-tile" style={{ paddingTop: 4, paddingBottom: 4 }}>
          <div className="toggle-row">
            <div>
              <strong>Table sounds</strong>
              <p className="lede" style={{ margin: 0, fontSize: '0.8rem' }}>
                Soft clicks when chips move (coming soon).
              </p>
            </div>
            <button
              type="button"
              className={`toggle ${state.soundOn ? 'on' : ''}`}
              aria-pressed={state.soundOn}
              onClick={() => updateProfile({ soundOn: !state.soundOn })}
            />
          </div>
          <div className="toggle-row">
            <div>
              <strong>Risk alerts</strong>
              <p className="lede" style={{ margin: 0, fontSize: '0.8rem' }}>
                Nudge when a wager eats over 25% of your bank.
              </p>
            </div>
            <button
              type="button"
              className={`toggle ${state.riskAlerts ? 'on' : ''}`}
              aria-pressed={state.riskAlerts}
              onClick={() => updateProfile({ riskAlerts: !state.riskAlerts })}
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>How Screel works</h2>
        </div>
        <div className="challenge">
          <h3>1. Set a ceiling</h3>
          <p>Pick how many minutes you get today — your starting chip stack.</p>
        </div>
        <div className="challenge">
          <h3>2. Link usage</h3>
          <p>Screen Time sync shows what’s already spent so the bank stays honest.</p>
        </div>
        <div className="challenge">
          <h3>3. Gamble the rest</h3>
          <p>Blackjack and roulette turn leftover minutes into wins — or force an earlier logout.</p>
        </div>
      </section>
    </div>
  );
}
