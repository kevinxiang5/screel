import { Brain, Home, Shield, Spade } from 'lucide-react';
import { useScreel } from '../context/ScreelContext';
import type { TabId } from '../types';

type StartChoice = {
  id: TabId;
  title: string;
  blurb: string;
  icon: typeof Brain;
};

const CHOICES: StartChoice[] = [
  {
    id: 'earn',
    title: 'Earn minutes back',
    blurb: 'Short skill puzzles. Fixed rewards. No stakes.',
    icon: Brain,
  },
  {
    id: 'play',
    title: 'Try a Play challenge',
    blurb: 'Optional stakes from today’s budget. Win or lose minutes.',
    icon: Spade,
  },
  {
    id: 'you',
    title: 'Check your bank',
    blurb: 'Allowance, reset time, and Screen Time link live here.',
    icon: Shield,
  },
  {
    id: 'home',
    title: 'Show me Home',
    blurb: 'Minutes left, daily goals, and quick jumps from one place.',
    icon: Home,
  },
];

/**
 * Second Thought-style post-setup chooser: pick where to land first.
 */
export function FirstRunGuide({ onChoose }: { onChoose: (tab: TabId) => void }) {
  const { state, completeGuide } = useScreel();
  const firstName =
    state.displayName && state.displayName !== 'Focus Mode'
      ? state.displayName.split(' ')[0]
      : '';

  const pick = (tab: TabId) => {
    completeGuide(tab);
    onChoose(tab);
  };

  return (
    <div className="age-gate setup-flow first-run-guide">
      <div className="age-gate-card setup-card setup-card-enter">
        <h1 className="display lg">
          {firstName ? `Where to first, ${firstName}?` : 'Where do you want to start?'}
        </h1>
        <p className="lede">
          Screel’s ready. Pick one path and we’ll drop you there. You can always switch tabs later.
        </p>

        <div className="start-choice-list">
          {CHOICES.map(({ id, title, blurb, icon: Icon }) => (
            <button key={id} type="button" className="start-choice" onClick={() => pick(id)}>
              <span className="start-choice-icon">
                <Icon size={20} />
              </span>
              <span className="start-choice-copy">
                <strong>{title}</strong>
                <span>{blurb}</span>
              </span>
            </button>
          ))}
        </div>

        <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 16 }} onClick={() => pick('home')}>
          Explore on my own
        </button>
      </div>
    </div>
  );
}
