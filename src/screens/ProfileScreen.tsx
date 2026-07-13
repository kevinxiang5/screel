import { motion } from 'framer-motion';
import { useScreelUI } from '../components/ScreelUI';
import type { LegalDoc } from '../components/LegalDocView';
import { useScreel } from '../context/ScreelContext';

export function ProfileScreen({ onOpenLegal }: { onOpenLegal: (doc: LegalDoc) => void }) {
  const { state, updateProfile } = useScreel();
  const { toast } = useScreelUI();

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Identity</div>
        <h1 className="display lg">You</h1>
        <p className="lede">Tune the house rules. Stay sharp. Stay honest about what Screel is.</p>
      </motion.div>

      <div className="disclosure-box" style={{ marginTop: 14 }}>
        <p>
          No real-money gambling. Minutes are fictional chips for digital-wellbeing gameplay and cannot be
          cashed out.
        </p>
      </div>

      <div className="profile-hero section" style={{ marginTop: 18 }}>
        <div className="avatar">{state.displayName.slice(0, 1).toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div
            className="label"
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--mute)',
            }}
          >
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
              onClick={() => {
                const next = !state.soundOn;
                updateProfile({ soundOn: next });
                toast(next ? 'Table sounds armed.' : 'Table sounds muted.', {
                  title: next ? 'Sound on' : 'Sound off',
                  tone: 'info',
                });
              }}
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
              onClick={() => {
                const next = !state.riskAlerts;
                updateProfile({ riskAlerts: next });
                toast(
                  next
                    ? 'We’ll warn you before oversized wagers.'
                    : 'High-roller mode — no 25% warnings.',
                  {
                    title: next ? 'Risk alerts on' : 'Risk alerts off',
                    tone: next ? 'success' : 'warn',
                  },
                );
              }}
            />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Legal &amp; rules</h2>
        </div>
        <div className="legal-links">
          <button type="button" className="btn btn-secondary btn-block" onClick={() => onOpenLegal('odds')}>
            Odds &amp; house rules
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => onOpenLegal('privacy')}>
            Privacy Policy
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => onOpenLegal('terms')}>
            Terms of Use
          </button>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => onOpenLegal('responsible')}>
            Responsible play
          </button>
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
          <h3>2. Track usage (sim today)</h3>
          <p>Simulate spend against the bank. Real system enforcement comes later via approved iOS APIs.</p>
        </div>
        <div className="challenge">
          <h3>3. Play the rest</h3>
          <p>
            Blackjack and roulette can grow or shrink your fictional minute bank. Not real-money gambling.
          </p>
        </div>
      </section>
    </div>
  );
}
