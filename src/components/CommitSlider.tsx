import { COMMIT_MAX } from '../types';

/** Opt-in commitment of today's minutes to the current challenge. Default 0. */
export function CommitSlider({
  value,
  onChange,
  remaining,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  remaining: number;
  disabled?: boolean;
}) {
  const max = Math.min(COMMIT_MAX, Math.max(0, remaining));
  const clamped = Math.min(value, max);

  return (
    <div className={`commit-slider ${disabled ? 'disabled' : ''}`}>
      <div className="commit-slider-head">
        <span className="hand-label">Commit (optional)</span>
        <strong>{clamped}m</strong>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={1}
        value={clamped}
        disabled={disabled || max === 0}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Minutes to commit to this challenge"
      />
      <p className="commit-slider-hint">
        {clamped === 0
          ? 'Default: only the bonus pot is on the line. Miss = nothing taken from your bank.'
          : `If you miss, ${clamped}m leaves today’s allowance. Keep the challenge and you get them back inside the pot.`}
      </p>
    </div>
  );
}
