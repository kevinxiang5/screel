import { motion } from 'framer-motion';
import { useScreel } from '../context/ScreelContext';

/** Age floor pending counsel confirmation — default 18 for US simulated-gambling safety. */
export const AGE_FLOOR = 18;

export function AgeGate() {
  const { verifyAge } = useScreel();

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
          <a className="btn btn-secondary" href="https://www.responsibleplay.org/" target="_blank" rel="noreferrer">
            Leave
          </a>
          <button type="button" className="btn btn-primary" onClick={verifyAge}>
            I am {AGE_FLOOR} or older
          </button>
        </div>
        <p className="age-gate-fine">
          By continuing you confirm you meet the age requirement and accept our Terms &amp; Privacy Policy
          (You tab).
        </p>
      </motion.div>
    </div>
  );
}
