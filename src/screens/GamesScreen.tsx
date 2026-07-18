import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, PlayCircle } from 'lucide-react';
import type { GameId } from '../types';
import { CHALLENGE_AD_DAILY_CAP, FREE_CHALLENGES_PER_DAY } from '../types';
import { BlackjackTable } from './BlackjackTable';
import { CrashGame } from './CrashGame';
import { DiceGame } from './DiceGame';
import { HiLoGame } from './HiLoGame';
import { MinesGame } from './MinesGame';
import { RouletteTable } from './RouletteTable';
import { SlotsGame } from './SlotsGame';
import { useScreel } from '../context/ScreelContext';
import { showRewardedAd } from '../native/monetization';
import { useScreelUI } from '../components/ScreelUI';

export function GamesScreen({
  activeGame,
  onSelect,
  onBack,
}: {
  activeGame: GameId;
  onSelect: (game: GameId) => void;
  onBack: () => void;
}) {
  const {
    state,
    challengesLeftToday,
    challengeAdsLeftToday,
    grantChallengeAdReward,
  } = useScreel();
  const { toast } = useScreelUI();
  const [adBusy, setAdBusy] = useState(false);

  if (activeGame === 'blackjack') return <BlackjackTable onBack={onBack} />;
  if (activeGame === 'roulette') return <RouletteTable onBack={onBack} />;
  if (activeGame === 'mines') return <MinesGame onBack={onBack} />;
  if (activeGame === 'crash') return <CrashGame onBack={onBack} />;
  if (activeGame === 'slots') return <SlotsGame onBack={onBack} />;
  if (activeGame === 'hilo') return <HiLoGame onBack={onBack} />;
  if (activeGame === 'dice') return <DiceGame onBack={onBack} />;

  const outOfChallenges = !state.isPremium && challengesLeftToday <= 0;
  const watchChallengeAd = async () => {
    if (adBusy || challengeAdsLeftToday <= 0) return;
    setAdBusy(true);
    try {
      const rewarded = await showRewardedAd('challenge');
      if (rewarded && grantChallengeAdReward()) {
        toast('+2 challenges added.', { title: 'Refill ready', tone: 'success' });
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Ad unavailable. Try again later.', {
        title: 'Could not load ad',
        tone: 'info',
      });
    } finally {
      setAdBusy(false);
    }
  };

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Challenges</div>
        <h1 className="display lg">Earn more minutes</h1>
        <p className="lede">
          Choose a minute stake, play the challenge, and bank the payout when you win. A miss subtracts your
          stake.{state.winStreak > 0 ? ` ${state.winStreak} win streak.` : ''}
        </p>
      </motion.div>

      <div className="access-panel section">
        <div>
          <span className="hand-label">{state.isPremium ? 'Premium' : 'Normal plan'}</span>
          <strong>
            {state.isPremium ? (
              <>
                <Crown size={17} /> Unlimited challenges
              </>
            ) : (
              `${challengesLeftToday} challenges left`
            )}
          </strong>
          {!state.isPremium && (
            <p>
              {FREE_CHALLENGES_PER_DAY} daily · {state.challengeAdsUsedToday}/{CHALLENGE_AD_DAILY_CAP} refills used
            </p>
          )}
        </div>
        {!state.isPremium && challengeAdsLeftToday > 0 && (
          <button type="button" className="btn btn-gold" onClick={() => void watchChallengeAd()} disabled={adBusy}>
            <PlayCircle size={17} /> {adBusy ? 'Loading…' : 'Watch ad · +2'}
          </button>
        )}
      </div>

      <div className="section" style={{ display: 'grid', gap: 14 }}>
        <button type="button" className="game-card featured bj" onClick={() => onSelect('blackjack')} disabled={outOfChallenges}>
          <span className="badge">stake</span>
          <h3>Twenty-one</h3>
          <p>Beat the house hand. Double on your first two cards — or go again after a win.</p>
        </button>
        <button type="button" className="game-card featured rl" onClick={() => onSelect('roulette')} disabled={outOfChallenges}>
          <span className="badge">stake</span>
          <h3>Multiplier wheel</h3>
          <p>Bet a multiplier (2×–20×). Land it to win stake × multiplier — miss and the stake is spent.</p>
        </button>

        <div className="grid-2">
          <button type="button" className="game-card mines" onClick={() => onSelect('mines')} disabled={outOfChallenges}>
            <span className="badge">ladder</span>
            <h3>Safe tiles</h3>
            <p>Choose the hazards. Each safe tile grows your payout.</p>
          </button>
          <button type="button" className="game-card crash" onClick={() => onSelect('crash')} disabled={outOfChallenges}>
            <span className="badge">live</span>
            <h3>Timing run</h3>
            <p>Bank before it pops — your payout scales with ×.</p>
          </button>
          <button type="button" className="game-card slots" onClick={() => onSelect('slots')} disabled={outOfChallenges}>
            <span className="badge">match</span>
            <h3>Match three</h3>
            <p>Any pair wins. Take the payout or try one double-up respin.</p>
          </button>
          <button type="button" className="game-card hilo" onClick={() => onSelect('hilo')} disabled={outOfChallenges}>
            <span className="badge">chain</span>
            <h3>Higher / lower</h3>
            <p>Correct calls grow your payout. Bank between calls.</p>
          </button>
          <button type="button" className="game-card dice" onClick={() => onSelect('dice')} disabled={outOfChallenges}>
            <span className="badge">risk</span>
            <h3>Roll under</h3>
            <p>Set your own target. Harder roll, bigger payout.</p>
          </button>
        </div>
      </div>
    </div>
  );
}
