import { WAGER_MAX } from '../types';

export function WagerSelector({
  value,
  remaining,
  limit,
  onChange,
  disabled = false,
}: {
  value: number;
  remaining: number;
  limit?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const max = Math.max(1, Math.min(WAGER_MAX, remaining, limit ?? WAGER_MAX));
  const selected = Math.min(value, max);
  const unavailable = disabled || remaining < 1 || (limit !== undefined && limit < 1);

  return (
    <div className={`wager-selector ${unavailable ? 'disabled' : ''}`}>
      <div className="wager-selector-head">
        <div>
          <span className="hand-label">Minute stake</span>
          <strong>{selected}m</strong>
        </div>
        <span>Win adds payout · miss subtracts stake</span>
      </div>
      <input
        type="range"
        min={1}
        max={max}
        step={1}
        value={selected}
        disabled={unavailable}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="Minute stake"
      />
      <div className="wager-presets">
        {[1, 5, 10, 20]
          .filter((amount) => amount <= max)
          .map((amount) => (
            <button
              type="button"
              key={amount}
              className={selected === amount ? 'active' : ''}
              onClick={() => onChange(amount)}
              disabled={unavailable}
            >
              {amount}m
            </button>
          ))}
      </div>
    </div>
  );
}
