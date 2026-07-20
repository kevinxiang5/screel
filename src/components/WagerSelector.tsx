export function WagerSelector({
  value,
  remaining,
  onChange,
  disabled = false,
}: {
  value: number;
  remaining: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const max = Math.max(1, remaining);
  const selected = Math.min(Math.max(1, value), max);
  const unavailable = disabled || remaining < 1;

  const presets = Array.from(
    new Set(
      [1, 5, 10, 25, 50, max]
        .map((n) => Math.round(n))
        .filter((n) => n >= 1 && n <= max),
    ),
  ).sort((a, b) => a - b);

  return (
    <div className={`wager-selector compact ${unavailable ? 'disabled' : ''}`}>
      <div className="wager-selector-head">
        <span className="hand-label">Stake</span>
        <strong>{selected}m</strong>
        <span className="wager-cap">max {max}m</span>
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
        {presets.map((amount) => (
          <button
            type="button"
            key={amount}
            className={selected === amount ? 'active' : ''}
            onClick={() => onChange(amount)}
            disabled={unavailable}
          >
            {amount === max && max > 50 ? 'All' : `${amount}m`}
          </button>
        ))}
      </div>
    </div>
  );
}
