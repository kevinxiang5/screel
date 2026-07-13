import { ArrowLeft } from 'lucide-react';
import { AGE_FLOOR } from './AgeGate';

export type LegalDoc = 'privacy' | 'terms' | 'odds' | 'responsible';

const TITLES: Record<LegalDoc, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Use',
  odds: 'Odds & house rules',
  responsible: 'Responsible play',
};

export function LegalDocView({ doc, onBack }: { doc: LegalDoc; onBack: () => void }) {
  return (
    <div className="screen">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> You
        </button>
      </div>
      <div className="eyebrow">Legal</div>
      <h1 className="display lg">{TITLES[doc]}</h1>
      <div className="legal-prose">
        {doc === 'privacy' && <PrivacyBody />}
        {doc === 'terms' && <TermsBody />}
        {doc === 'odds' && <OddsBody />}
        {doc === 'responsible' && <ResponsibleBody />}
      </div>
    </div>
  );
}

function PrivacyBody() {
  return (
    <>
      <p>
        <em>Draft for counsel review. Host a copy at your public Privacy Policy URL for App Store Connect.
        Last updated: 2026-07-13.</em>
      </p>
      <h3>Who we are</h3>
      <p>Screel (“we”) provides a wellbeing-gameplay app. Contact: support@screel.app (replace with your email).</p>
      <h3>Data we store on your device</h3>
      <p>
        Display nickname, minute bank, usage simulation flags, game history, and settings (including sound and
        risk alerts). Stored locally (e.g. browser localStorage or on-device storage). We do not operate an
        account system in v1.
      </p>
      <h3>Network</h3>
      <p>
        The web build may load fonts from Google Fonts (googleapis / gstatic). No analytics or ad SDKs ship in
        the current binary. Future iOS builds that use Apple Screen Time / Device Activity APIs will process
        usage data on-device as described in App Store privacy nutrition labels.
      </p>
      <h3>Children</h3>
      <p>Screel is not directed to children under {AGE_FLOOR}. Do not use the app if you are under {AGE_FLOOR}.</p>
      <h3>Your choices</h3>
      <p>Clear site data / reinstall to erase local state. Contact support for privacy requests.</p>
    </>
  );
}

function TermsBody() {
  return (
    <>
      <p>
        <em>Draft for counsel review. Last updated: 2026-07-13. US-oriented. Not a substitute for legal advice.</em>
      </p>
      <h3>Eligibility</h3>
      <p>You must be at least {AGE_FLOOR} years old and able to form a binding contract where you live.</p>
      <h3>No real-money gambling</h3>
      <p>
        Screel offers <strong>simulated</strong> blackjack and roulette. The only in-app currency is{' '}
        <strong>minutes</strong> for digital-wellbeing gameplay. Minutes have no cash value, cannot be
        withdrawn, sold, or redeemed for money or prizes of monetary value.
      </p>
      <h3>Not medical advice</h3>
      <p>
        Screel is entertainment / self-management tooling, not a medical device, therapy, or clinical Screen
        Time product endorsement by Apple.
      </p>
      <h3>Acceptable use</h3>
      <p>Do not reverse engineer for harm, misrepresent affiliation with Apple or casinos, or use the app unlawfully.</p>
      <h3>Disclaimer</h3>
      <p>App provided “as is.” Liability limited to the maximum extent permitted by law.</p>
      <h3>Apple not a sponsor</h3>
      <p>Apple is not a sponsor of Screel contests, challenges, or promotions (if any).</p>
    </>
  );
}

function OddsBody() {
  return (
    <>
      <div className="disclosure-box">
        <p>No real money. Payouts adjust your minute bank only.</p>
      </div>
      <h3>Blackjack</h3>
      <ul>
        <li>Blackjack (two-card 21, not from split) pays <strong>3:2</strong></li>
        <li>Winning hands pay <strong>1:1</strong></li>
        <li>Insurance pays <strong>2:1</strong> if the dealer has blackjack</li>
        <li>Push returns your stake</li>
        <li>Dealer stands on all 17s (including soft 17)</li>
        <li>Six-deck shoe; hit / stand / double / split available per house rules in-app</li>
      </ul>
      <h3>Roulette (European single-zero)</h3>
      <ul>
        <li>Straight-up number: <strong>35:1</strong> profit (+ stake returned)</li>
        <li>Dozen or column: <strong>2:1</strong></li>
        <li>Red / black, odd / even, 1–18 / 19–36: <strong>1:1</strong></li>
        <li>Zero loses even-money and dozen/column bets</li>
      </ul>
      <p>Random outcomes use the device’s local random number generator for entertainment simulation.</p>
    </>
  );
}

function ResponsibleBody() {
  return (
    <>
      <p>
        Screel is meant to make limits playful — not to encourage compulsive play. Set a daily ceiling you can
        live with. Use risk alerts. Take breaks.
      </p>
      <p>
        If gambling-like play is a problem for you, visit{' '}
        <a href="https://www.ncpgambling.org/" target="_blank" rel="noreferrer">
          ncpgambling.org
        </a>{' '}
        or local support resources. Screel is not therapy or a crisis service.
      </p>
    </>
  );
}
