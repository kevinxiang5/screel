import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clapperboard, PlayCircle } from 'lucide-react';
import { AD_RESCUE_MINUTES } from '../types';
import { useScreel } from '../context/ScreelContext';
import { useScreelUI } from './ScreelUI';

/**
 * Rewarded-ad rescue: watch one ad, get minutes back.
 *
 * The player sits through a placeholder spot today; on native this is the spot
 * where an AdMob rewarded ad loads and `claimAdRescue` runs in its reward
 * callback. Keeping the same UX contract (blocking view, no skip, reward at
 * the end) means swapping the placeholder for the SDK later touches only this file.
 */
const AD_SECONDS = 15;

export function AdRescueCard() {
  const { remaining, adRescuesLeft } = useScreel();
  const [watching, setWatching] = useState(false);

  // Offer a rescue only when the bank is basically dead.
  if (remaining >= AD_RESCUE_MINUTES || adRescuesLeft <= 0) return null;

  return (
    <>
      <div className="ad-rescue-card">
        <div className="ad-rescue-copy">
          <span className="badge">Boost</span>
          <h3>Out of minutes?</h3>
          <p>
            Watch one ad for <strong>+{AD_RESCUE_MINUTES} minutes</strong>. {adRescuesLeft} left today.
          </p>
        </div>
        <button type="button" className="btn btn-gold" onClick={() => setWatching(true)}>
          <PlayCircle size={18} /> Watch ad
        </button>
      </div>
      <AnimatePresence>{watching && <AdPlayer onClose={() => setWatching(false)} />}</AnimatePresence>
    </>
  );
}

function AdPlayer({ onClose }: { onClose: () => void }) {
  const { claimAdRescue } = useScreel();
  const { toast } = useScreelUI();
  const [secondsLeft, setSecondsLeft] = useState(AD_SECONDS);
  const done = secondsLeft <= 0;

  useEffect(() => {
    const id = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const claim = () => {
    const ok = claimAdRescue();
    if (ok) {
      toast(`+${AD_RESCUE_MINUTES}m landed in your bank.`, { title: 'Rescue claimed', tone: 'success' });
    } else {
      toast('No rescues left today — back tomorrow.', { title: 'Capped out', tone: 'warn' });
    }
    onClose();
  };

  return (
    <motion.div
      className="ad-player"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="ad-player-frame">
        <div className="ad-player-tag">Ad</div>
        <Clapperboard size={56} />
        <h3>Sponsor spot</h3>
        <p>Real ads land in the next update. Sit tight — your minutes are on the way.</p>
        <div className="meter-track" style={{ width: '80%' }}>
          <div
            className="meter-fill"
            style={{ width: `${((AD_SECONDS - secondsLeft) / AD_SECONDS) * 100}%` }}
          />
        </div>
        {done ? (
          <button type="button" className="btn btn-gold btn-block" onClick={claim}>
            Claim +{AD_RESCUE_MINUTES} minutes
          </button>
        ) : (
          <span className="ad-player-count">Reward in {secondsLeft}s</span>
        )}
      </div>
    </motion.div>
  );
}
