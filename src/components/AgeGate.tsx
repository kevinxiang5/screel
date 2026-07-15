import { motion } from 'framer-motion';
import { useScreel } from '../context/ScreelContext';

/** Age floor pending counsel confirmation — default 18 for US simulated-gambling safety. */
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
          Screel includes <strong>simulated gambling</strong> (blackjack &amp; roulette) using fictional
          minute chips. No real money. Not for anyone under {AGE_FLOOR}.
        </p>
        <div className="disclosure-box">
          <p>
            No real-money gambling. Minutes cannot be cashed out, sold, or redeemed for prizes of monetary
            value. Practice here does not imply success at real-money gambling.
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

/** Hard lock if the user said they are under 18. */
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
          This app includes simulated gambling-style play and is only for people {AGE_FLOOR} and older. You’ve
          been locked out on this device.
        </p>
        <div className="disclosure-box">
          <p>
            If this was a mistake, delete the app and reinstall, or clear site data — then answer the age
            check honestly.
          </p>
        </div>
        <a
          className="btn btn-primary btn-block"
          style={{ marginTop: 18 }}
          href="https://www.responsibleplay.org/"
          target="_blank"
          rel="noreferrer"
        >
          Responsible play resources
        </a>
      </motion.div>
    </div>
  );
}
