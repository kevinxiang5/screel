import { motion } from 'framer-motion';
import { GAME_EARN_DAILY_CAP } from '../types';

/** Live pot readout for press-your-luck challenges. */
export function PotTicker({
  pot,
  earnLeft,
  commit = 0,
  label = 'On the line',
}: {
  pot: number;
  earnLeft: number;
  commit?: number;
  label?: string;
}) {
  const display = Math.max(0, Math.round(pot * 10) / 10);
  return (
    <div className="pot-ticker">
      <div>
        <span className="hand-label">{label}</span>
        <motion.strong
          key={display}
          initial={{ scale: 1.12, color: 'var(--lime)' }}
          animate={{ scale: 1, color: 'var(--snow)' }}
          transition={{ duration: 0.25 }}
        >
          {display}m
        </motion.strong>
      </div>
      <p>
        {commit > 0 ? `${commit}m committed · ` : ''}
        {earnLeft <= 0
          ? `Daily keep cap reached (${GAME_EARN_DAILY_CAP}m).`
          : `${earnLeft}m still keepable today.`}
      </p>
    </div>
  );
}
