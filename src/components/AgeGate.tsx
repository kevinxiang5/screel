import { useScreel } from '../context/ScreelContext';

export const AGE_FLOOR = 13;

export function AgeGate() {
  const { verifyAge, blockUnderage } = useScreel();

  return (
    <div className="age-gate">
      <div className="age-gate-card setup-card-enter">
        <div className="eyebrow">Welcome</div>
        <h1 className="display lg">Ready to focus?</h1>
        <p className="lede">
          Screel is a <strong>screen-time helper</strong>. Set a daily minute budget, optionally link Apple
          Screen Time, clear skill puzzles to earn minutes back, and optionally play short focus challenges
          that adjust today’s allowance.
        </p>
        <div className="disclosure-box">
          <p>
            Earn puzzles give fixed minutes with no stake. Optional Play challenges may use minute stakes —
            wins can add minutes and misses subtract the selected stake from today’s allowance. Minutes have
            no cash value, cannot be bought or withdrawn, and are not prizes. No real-money gambling. For
            self-directed screen-time management (ages {AGE_FLOOR}+).
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
          By continuing you confirm you are {AGE_FLOOR}+ and accept Terms &amp; Privacy (You tab). Choosing
          under {AGE_FLOOR} locks Screel on this device.
        </p>
      </div>
    </div>
  );
}

export function AgeBlocked() {
  return (
    <div className="age-gate">
      <div className="age-gate-card setup-card-enter">
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
      </div>
    </div>
  );
}
