import { motion } from 'framer-motion';
import { useScreelUI } from '../components/ScreelUI';
import type { LegalDoc } from '../components/LegalDocView';
import { useScreel } from '../context/ScreelContext';
import type { FontTheme } from '../types';
import { BankScreen } from './BankScreen';

const FONT_OPTIONS: { id: FontTheme; label: string; blurb: string }[] = [
  { id: 'felt', label: 'Felt', blurb: 'Bold Syne headlines (default)' },
  { id: 'editorial', label: 'Editorial', blurb: 'Serif luxury — Playfair + Lora' },
  { id: 'soft', label: 'Soft', blurb: 'Round & friendly Fraunces + Nunito' },
  { id: 'clean', label: 'Clean', blurb: 'Sharp geometric DM Sans' },
];

export function ProfileScreen({ onOpenLegal }: { onOpenLegal: (doc: LegalDoc) => void }) {
  const { state, updateProfile, setFontTheme } = useScreel();
  const { toast } = useScreelUI();

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Profile</div>
        <h1 className="display lg">You</h1>
        <p className="lede">
          Settings, Screen Time link, and the rules that keep Screel honest.
        </p>
      </motion.div>

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
            onChange={(e) => updateProfile({ displayName: e.target.value || 'Focus Mode' })}
          />
          <p className="lede" style={{ marginTop: 8, fontSize: '0.8rem' }}>
            Level {state.level} · {state.xp} XP · {state.streak} day streak
          </p>
        </div>
      </div>

      <BankScreen embedded />

      <section className="section">
        <div className="section-head">
          <h2>
            <span className="idx">A</span> Personalize
          </h2>
        </div>
        <div className="profile-section-card">
          <p className="lede" style={{ marginTop: 0, fontSize: '0.85rem' }}>
            Switch the whole app’s fonts.
          </p>
          <div className="font-theme-grid">
            {FONT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`font-theme-card ${state.fontTheme === opt.id ? 'active' : ''}`}
                data-font-preview={opt.id}
                onClick={() => {
                  setFontTheme(opt.id);
                  toast(`${opt.label} typeface applied.`, { title: 'Fonts updated', tone: 'success' });
                }}
              >
                <strong>{opt.label}</strong>
                <span>{opt.blurb}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            <span className="idx">B</span> Controls
          </h2>
        </div>
        <div className="profile-section-card">
          <div className="toggle-row">
            <div>
              <strong>Sounds</strong>
              <p className="lede" style={{ margin: 0, fontSize: '0.8rem' }}>
                Soft UI sounds (coming soon).
              </p>
            </div>
            <button
              type="button"
              className={`toggle ${state.soundOn ? 'on' : ''}`}
              aria-pressed={state.soundOn}
              onClick={() => {
                const next = !state.soundOn;
                updateProfile({ soundOn: next });
                toast(next ? 'Sounds on.' : 'Sounds muted.', {
                  title: next ? 'Sound on' : 'Sound off',
                  tone: 'info',
                });
              }}
            />
          </div>
          <div className="profile-inline-note">
            Earn puzzles give fixed minutes with no stake. Optional Play challenges may adjust today’s
            allowance with minute stakes — wins can add a payout, misses subtract the stake. Minutes have no
            cash value and are not prizes.
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>
            <span className="idx">C</span> Legal &amp; support
          </h2>
        </div>
        <div className="profile-section-card">
          <div className="legal-links">
            <button type="button" className="btn btn-secondary btn-block" onClick={() => onOpenLegal('odds')}>
              How earning works
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => onOpenLegal('privacy')}>
              Privacy Policy
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => onOpenLegal('terms')}>
              Terms of Use
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={() => onOpenLegal('responsible')}>
              Healthy habits
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
