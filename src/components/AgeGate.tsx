import { motion } from 'framer-motion';
import { useScreel } from '../context/ScreelContext';

/** Age floor for Screel’s screen-time helper (habit tool + minigames). */
export const AGE_FLOOR = 18;

export function AgeGate() {
  const { verifyAge, blockUnderage } = useScreel();

  return (
    <div className="age-gate">
      <motion.div
        className="age-gate-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="eyebrow">Age check</div>
        <h1 className="display lg">Are you {AGE_FLOOR}+?</h1>
        <p className="lede">
          Screel is a <strong>screen-time helper</strong> with optional minigames that can earn extra
          minutes for your daily allowance. No real money. Not for anyone under {AGE_FLOOR}.
        </p>
        <div className="disclosure-box">
          <p>
            You set a daily minute budget and can link Apple Screen Time for apps you choose. Minigames
            never take minutes from your bank when you lose — they only add a fixed reward when you win,
            up to a daily cap.
          </p>
        </div>
        <div className="bj-actions" style={{ marginTop: 20, gridTemplateColumns: '1fr 1fr' }}>
          <button type="button" className="btn btn-secondary" onClick={blockUnderage}>
            No — under {AGE_FLOOR}
          </button>
          <button type="button" className="btn btn-primary" onClick={verifyAge}>
            I am {AGE_FLOOR}+
          </button>
        </div>
        <p className="age-gate-fine">
          By continuing you confirm you meet the age requirement and accept our Terms &amp; Privacy Policy
          (You tab). Choosing under {AGE_FLOOR} locks Screel on this device.
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
        <h1 className="display lg">Come back when you’re {AGE_FLOOR}</h1>
        <p className="lede">
          Screel is a screen-time helper for people {AGE_FLOOR} and older. You’ve been locked out on this
          device.
        </p>
        <div className="disclosure-box">
          <p>
            If this was a mistake, delete the app and reinstall, or clear site data — then answer the age
            check honestly.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
