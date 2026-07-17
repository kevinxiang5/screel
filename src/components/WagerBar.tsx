import { ChipFace } from './Chips';

/** Shared wager builder for the arcade games (Mines, Crash, Slots, Hi-Lo, Dice). */
export function WagerBar({
  wager,
  onChange,
  max,
  disabled,
}: {
  wager: number;
  onChange: (n: number) => void;
  max: number;
  disabled?: boolean;
}) {
  const add = (v: number) => onChange(Math.min(max, wager + v));

  return (
    <div className="wager-bar">
      <div className="wager-readout">
        <span>Wager</span>
        <strong>{wager}m</strong>
      </div>
      <div className="chip-tray">
        {[1, 5, 10, 25].map((v) => (
          <ChipFace key={v} value={v} size={40} disabled={disabled || wager + v > max} onClick={() => add(v)} />
        ))}
      </div>
      <div className="wager-quick">
        <button type="button" className="btn btn-sm btn-secondary" disabled={disabled || wager === 0} onClick={() => onChange(0)}>
          Clear
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          disabled={disabled || max < 2}
          onClick={() => onChange(Math.max(1, Math.floor(max / 2)))}
        >
          Half
        </button>
        <button type="button" className="btn btn-sm btn-secondary" disabled={disabled || max < 1} onClick={() => onChange(max)}>
          Max
        </button>
      </div>
    </div>
  );
}
