import { ArrowLeft } from 'lucide-react';
import { AGE_FLOOR } from './AgeGate';

export type LegalDoc = 'privacy' | 'terms' | 'odds' | 'responsible';

const TITLES: Record<LegalDoc, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Use',
  odds: 'How earning works',
  responsible: 'Healthy habits',
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
      <h3>No real money</h3>
      <p>
        Screel is a screen-time helper. The only in-app unit is <strong>minutes</strong> of daily allowance.
        Minutes have no cash value and cannot be withdrawn, sold, or redeemed for money or prizes.
      </p>
      <h3>Not medical advice</h3>
      <p>
        Screel is self-management tooling, not a medical device, therapy, or clinical product endorsement by
        Apple.
      </p>
      <h3>Acceptable use</h3>
      <p>Do not reverse engineer for harm, misrepresent affiliation with Apple, or use the app unlawfully.</p>
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
        <p>
          Minigames never wager your bank. A successful challenge adds a fixed reward (capped per day). A miss
          awards nothing and takes nothing.
        </p>
      </div>
      <h3>Fixed rewards (examples)</h3>
      <ul>
        <li>Blackjack — beat the dealer: <strong>+5m</strong></li>
        <li>Color spin — match your color: <strong>+4m</strong></li>
        <li>Safe tiles — five clear tiles: <strong>+6m</strong></li>
        <li>Timing run — claim at ×1.5+: <strong>+5m</strong></li>
        <li>Match three — any pair: <strong>+3m</strong></li>
        <li>Higher / lower — three in a row: <strong>+5m</strong></li>
        <li>Roll under 50: <strong>+4m</strong></li>
      </ul>
      <p>Daily earn from minigames is capped (30m by default). Outcomes use the device RNG for challenge play.</p>
    </>
  );
}

function ResponsibleBody() {
  return (
    <>
      <p>
        Screel is meant to make screen limits a little more intentional. Set a daily ceiling you can live with.
        Take breaks from both apps and challenges.
      </p>
      <p>Screel is not therapy or a crisis service. If you need help with habits or wellbeing, talk to a professional.</p>
    </>
  );
}
