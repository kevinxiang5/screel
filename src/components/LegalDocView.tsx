import { ArrowLeft } from 'lucide-react';
import { AGE_FLOOR } from './AgeGate';
import { PUZZLE_DAILY_CAP, PUZZLE_REWARDS } from '../types';

export type LegalDoc = 'privacy' | 'terms' | 'odds' | 'responsible';

const TITLES: Record<LegalDoc, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Use',
  odds: 'How challenges work',
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
        <em>Last updated: July 28, 2026.</em>
      </p>
      <h3>Who we are</h3>
      <p>Screel (“we”) provides a screen-time helper app. Contact: support@screel.app.</p>
      <h3>Data we store on your device</h3>
      <p>
        Display nickname, minute bank, focus goal and setup answers, challenge history, puzzle progress,
        usage archive, and settings. Stored locally (e.g. browser localStorage or on-device storage). We do
        not operate an account system in this version.
      </p>
      <h3>Screen Time</h3>
      <p>
        If you link Apple Screen Time / Family Controls on iPhone, selection and usage signals are processed
        on-device through Apple’s frameworks. Screel does not sell that data.
      </p>
      <h3>Network</h3>
      <p>The web build may load fonts from Google Fonts. Core play state stays on your device.</p>
      <h3>Children</h3>
      <p>
        Screel is not directed to children under {AGE_FLOOR}. Do not use the app if you are under {AGE_FLOOR}.
      </p>
      <h3>Your choices</h3>
      <p>Clear site data / reinstall to erase local state. Contact support for privacy requests.</p>
    </>
  );
}

function TermsBody() {
  return (
    <>
      <p>
        <em>Last updated: July 28, 2026.</em>
      </p>
      <h3>Eligibility</h3>
      <p>
        Screel is for self-directed screen-time management by people {AGE_FLOOR} or older who can form a
        binding contract where they live (or have guardian consent where required).
      </p>
      <h3>What Screel is</h3>
      <p>
        Screel is a productivity / screen-time helper. It is entertainment tooling for managing a personal
        minute allowance — not a bank, not a casino, and not a real-money gaming service.
      </p>
      <h3>No real money · no prizes</h3>
      <p>
        The only in-app unit is <strong>minutes</strong> of daily allowance on this device. Minutes have no
        cash value and cannot be purchased, withdrawn, transferred, sold, or redeemed for money, goods, or
        prizes. Nothing here is a wager of real currency.
      </p>
      <h3>Not gambling</h3>
      <p>
        Optional Play challenges may use chance-based outcomes that adjust today’s minute allowance only.
        They are not lotteries, sportsbooks, or games of chance for money. Skill puzzles on Earn use fixed
        rewards with no stake.
      </p>
      <h3>Not medical advice</h3>
      <p>
        Screel is self-management tooling, not a medical device, therapy, diagnosis, or clinical product.
        Apple does not endorse Screel as a health product.
      </p>
      <h3>Acceptable use</h3>
      <p>
        Do not reverse engineer for harm, misrepresent affiliation with Apple, attempt to monetize minutes,
        or use the app unlawfully.
      </p>
      <h3>Disclaimer</h3>
      <p>
        App provided “as is.” To the maximum extent permitted by law, we disclaim warranties and limit
        liability for indirect or consequential damages.
      </p>
      <h3>Apple not a sponsor</h3>
      <p>
        Apple is not a sponsor of Screel, its challenges, or any promotion. Screen Time / Family Controls
        remain Apple technologies; Screel only requests permission you grant.
      </p>
    </>
  );
}

function OddsBody() {
  return (
    <>
      <div className="disclosure-box">
        <p>
          Screel moves <strong>minutes of allowance only</strong>. Minutes cannot be purchased, transferred,
          or redeemed for value. This is not real-money gambling.
        </p>
      </div>
      <h3>Skill puzzles (Earn)</h3>
      <ul>
        <li>
          Fixed rewards only: +{PUZZLE_REWARDS.easy}m / +{PUZZLE_REWARDS.medium}m / +{PUZZLE_REWARDS.hard}m —
          no multipliers or RNG payouts
        </li>
        <li>Daily cap ({PUZZLE_DAILY_CAP} minutes from puzzles) and a short cooldown between clears</li>
        <li>No stake is required to play a puzzle</li>
      </ul>
      <h3>Optional focus challenges (Play)</h3>
      <ul>
        <li>You may choose a minute stake before a challenge</li>
        <li>A win can add the displayed payout to today’s allowance; a miss subtracts the stake</li>
        <li>
          Challenges include card, timing, tile, and drop-style formats — outcomes may use device randomness
        </li>
      </ul>
      <p>
        Challenge payouts are intentionally costly (built-in friction) so staking minutes remains a real
        tradeoff against your budget. Puzzle earn-back has no payout friction of that kind. Results are for
        personal screen-time management only.
      </p>
    </>
  );
}

function ResponsibleBody() {
  return (
    <>
      <p>
        Screel is meant to make screen limits more intentional. Set a daily ceiling you can live with. Take
        breaks from both apps and challenges.
      </p>
      <p>
        If Play challenges stop feeling useful and start feeling compulsive, pause them and use Earn puzzles
        or lower your stake — or step away from the app.
      </p>
      <p>
        Screel is not therapy or a crisis service. If you need help with habits or wellbeing, talk to a
        qualified professional.
      </p>
    </>
  );
}
