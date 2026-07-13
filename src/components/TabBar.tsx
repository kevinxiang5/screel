import { BarChart3, Home, Spade, Timer, UserRound } from 'lucide-react';
import type { TabId } from '../types';

const TABS: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'play', label: 'Play', icon: Spade },
  { id: 'bank', label: 'Bank', icon: Timer },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
  { id: 'you', label: 'You', icon: UserRound },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (tab: TabId) => void;
}) {
  return (
    <nav className="tab-bar" aria-label="Main">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={`tab-btn ${active === id ? 'active' : ''}`}
          onClick={() => onChange(id)}
          aria-current={active === id ? 'page' : undefined}
        >
          <Icon strokeWidth={active === id ? 2.5 : 2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
