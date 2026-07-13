import { CHIP_VALUES } from '../utils/roulette';

const CHIP_COLORS: Record<number, { bg: string; ring: string; text: string }> = {
  1: { bg: '#e8e8e8', ring: '#9a9a9a', text: '#1a1a1a' },
  2: { bg: '#5b9dff', ring: '#2a6fd4', text: '#fff' },
  5: { bg: '#ff4b4b', ring: '#c01f1f', text: '#fff' },
  10: { bg: '#2dd4a0', ring: '#1a9a72', text: '#062218' },
  25: { bg: '#1a1a1a', ring: '#f0c94d', text: '#f0c94d' },
};

export function ChipFace({
  value,
  size = 44,
  selected,
  disabled,
  onClick,
}: {
  value: number;
  size?: number;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const c = CHIP_COLORS[value] ?? CHIP_COLORS[1];
  return (
    <button
      type="button"
      className={`chip-face ${selected ? 'selected' : ''}`}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 30%, ${c.bg}, ${c.bg})`,
        color: c.text,
        boxShadow: selected
          ? `0 0 0 3px var(--lime), 0 6px 16px rgba(0,0,0,0.4)`
          : `0 4px 0 ${c.ring}, 0 8px 18px rgba(0,0,0,0.35)`,
      }}
      aria-label={`${value} minute chip`}
    >
      <span className="chip-face-ring" style={{ borderColor: c.ring }} />
      <strong>{value}</strong>
    </button>
  );
}

export function ChipTray({
  selected,
  onSelect,
  disabled,
  values = [...CHIP_VALUES],
}: {
  selected: number;
  onSelect: (v: number) => void;
  disabled?: boolean;
  values?: number[];
}) {
  return (
    <div className="chip-tray">
      {values.map((v) => (
        <ChipFace
          key={v}
          value={v}
          selected={selected === v}
          disabled={disabled}
          onClick={() => onSelect(v)}
        />
      ))}
    </div>
  );
}

export function StackChip({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  const top =
    [...CHIP_VALUES].reverse().find((v) => amount >= v) ??
    (amount >= 25 ? 25 : amount >= 10 ? 10 : amount >= 5 ? 5 : amount >= 2 ? 2 : 1);
  const c = CHIP_COLORS[top] ?? CHIP_COLORS[1];
  return (
    <div
      className="stack-chip"
      style={{
        background: c.bg,
        color: c.text,
        boxShadow: `0 2px 0 ${c.ring}, 0 4px 10px rgba(0,0,0,0.4)`,
      }}
    >
      {amount}
    </div>
  );
}
