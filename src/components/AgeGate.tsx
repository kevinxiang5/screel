import { motion } from 'framer-motion';
import { useScreel } from '../context/ScreelContext';

/**
 * Welcome gate for self-directed screen-time management.
 * Kept as a soft age disclosure (not a casino 18+ gate) for App Store framing.
 */
export const AGE_FLOOR = 13;

export function AgeGate() {
  const { verifyAge, blockUnderage } = useScreel();

  return (
    <div className="age-gate">
      <motion.div
        className="age-gate-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="eyebrow">Welcome</div>
        <h1 className="display lg">Ready to focus?</h1>
        <p className="lede">
          Screel is a <strong>screen-time helper</strong>. Set a daily minute budget, optionally link Apple
          Screen Time, and stake minutes on short challenges for a chance to win more.
        </p>
        <div className="disclosure-box">
          <p>
            Challenges use minute stakes. Wins add minutes and misses subtract the selected stake from
            today’s allowance. Minutes have no cash value. No real money. Designed for self-directed screen-time management (ages{' '}
            {AGE_FLOOR}+).
          </p>
        </div>
        <div className="bj-actions" style={{ marginTop: 20, gridTemplateColumns: '1fr 1fr' }}>
          <button type="button" className="btn btn-secondary" onClick={blockUnderage}>
            Under {AGE_FLOOR}
          </button>
          <button type="button" className="btn btn-primary" onClick={verifyAge}>
            Continue
          </button>
        </div>
        <p className="age-gate-fine">
          By continuing you confirm Screel fits your needs and you accept Terms &amp; Privacy (You tab).
          Choosing under {AGE_FLOOR} locks Screel on this device.
        </p>
      </motion.div>
    </div>
  );
}

export function AgeBlocked() {
  return (
    <div className="age-gate">
      <motion.div
        className="age-gate-card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="eyebrow">Screel</div>
        <h1 className="display lg">Come back later</h1>
        <p className="lede">
          Screel is a screen-time helper designed for people {AGE_FLOOR} and older managing their own device
          habits. You’ve been locked out on this device.
        </p>
        <div className="disclosure-box">
          <p>
            If this was a mistake, delete the app and reinstall, or clear site data — then answer the welcome
            check honestly.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
