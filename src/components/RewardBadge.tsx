import { GAME_EARN_DAILY_CAP } from '../types';

/** Shows the fixed challenge reward and how much earn room is left today. */
export function RewardBadge({
  reward,
  earnLeft,
}: {
  reward: number;
  earnLeft: number;
}) {
  const capped = earnLeft < reward;
  return (
    <div className="reward-badge">
      <div>
        <span className="hand-label">Challenge reward</span>
        <strong>+{reward}m</strong>
      </div>
      <p>
        {earnLeft <= 0
          ? `Daily earn cap reached (${GAME_EARN_DAILY_CAP}m).`
          : capped
            ? `Only ${earnLeft}m left under today’s ${GAME_EARN_DAILY_CAP}m earn cap.`
            : `${earnLeft}m still earnable today.`}
      </p>
    </div>
  );
}
