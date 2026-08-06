import { useState, type ComponentType } from 'react';
import { motion } from 'framer-motion';
import {
  Binary,
  Brain,
  Calculator,
  Eye,
  FlipHorizontal2,
  Grid3x3,
  Hash,
  KeyRound,
  Layers,
  Lightbulb,
  ListOrdered,
  Lock,
  Puzzle,
  Sigma,
  SpellCheck,
  SquareAsterisk,
  Timer,
  WholeWord,
} from 'lucide-react';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';
import { hapticSuccess, hapticWarning } from '../native/haptics';
import {
  BinaryPuzzle,
  CipherPuzzle,
  CountdownPuzzle,
  EquationPuzzle,
  GridPuzzle,
  HanoiPuzzle,
  LightsPuzzle,
  MastermindPuzzle,
  MathPuzzle,
  MemoryPuzzle,
  NBackPuzzle,
  OddOnePuzzle,
  OrderPuzzle,
  PatternPuzzle,
  PrimesPuzzle,
  SafePuzzle,
  ScramblePuzzle,
  SequencePuzzle,
  SliderPuzzle,
  StroopPuzzle,
  SudokuPuzzle,
  SumGridPuzzle,
} from '../puzzles/PuzzleGames';
import { PUZZLE_DAILY_CAP, PUZZLE_REWARDS, type PuzzleId } from '../types';

type Diff = keyof typeof PUZZLE_REWARDS;

type PuzzleComponent = ComponentType<{
  difficulty: Diff;
  onClear: () => void;
  onFail: () => void;
}>;

const CATALOG: {
  id: PuzzleId;
  title: string;
  blurb: string;
  icon: typeof Brain;
  difficulty: Diff;
  Component: PuzzleComponent;
}[] = [
  // +2m easy
  {
    id: 'math',
    title: 'Quick Math',
    blurb: 'Short arithmetic streak.',
    icon: Sigma,
    difficulty: 'easy',
    Component: MathPuzzle,
  },
  {
    id: 'equation',
    title: 'Missing Link',
    blurb: 'Solve for the unknown.',
    icon: Calculator,
    difficulty: 'easy',
    Component: EquationPuzzle,
  },
  {
    id: 'stroop',
    title: 'Ink Trap',
    blurb: 'Name the ink, ignore the word.',
    icon: Eye,
    difficulty: 'easy',
    Component: StroopPuzzle,
  },
  {
    id: 'scramble',
    title: 'Word Knot',
    blurb: 'Unscramble short focus words.',
    icon: WholeWord,
    difficulty: 'easy',
    Component: ScramblePuzzle,
  },
  {
    id: 'cipher',
    title: 'Caesar Crack',
    blurb: 'Decode a light Caesar shift.',
    icon: KeyRound,
    difficulty: 'easy',
    Component: CipherPuzzle,
  },
  {
    id: 'oddone',
    title: 'Odd Hue',
    blurb: 'Spot the different tile.',
    icon: SquareAsterisk,
    difficulty: 'easy',
    Component: OddOnePuzzle,
  },
  {
    id: 'order',
    title: 'Order Rush',
    blurb: 'Tap 1→N before time runs out.',
    icon: ListOrdered,
    difficulty: 'easy',
    Component: OrderPuzzle,
  },
  {
    id: 'memory',
    title: 'Pair Vault',
    blurb: 'Match pairs on a small board.',
    icon: Layers,
    difficulty: 'easy',
    Component: MemoryPuzzle,
  },

  // +3m medium
  {
    id: 'sequence',
    title: 'Next Term',
    blurb: 'Find the next number in the series.',
    icon: ListOrdered,
    difficulty: 'medium',
    Component: SequencePuzzle,
  },
  {
    id: 'binary',
    title: 'Bit Decode',
    blurb: 'Convert binary to decimal.',
    icon: Binary,
    difficulty: 'medium',
    Component: BinaryPuzzle,
  },
  {
    id: 'pattern',
    title: 'Pattern Pulse',
    blurb: 'Replay the color sequence.',
    icon: Brain,
    difficulty: 'medium',
    Component: PatternPuzzle,
  },
  {
    id: 'primes',
    title: 'Prime Hunt',
    blurb: 'Tap every prime against the clock.',
    icon: Timer,
    difficulty: 'medium',
    Component: PrimesPuzzle,
  },
  {
    id: 'grid',
    title: 'Grid Lock',
    blurb: 'Path S→E without hitting walls.',
    icon: Grid3x3,
    difficulty: 'medium',
    Component: GridPuzzle,
  },
  {
    id: 'lights',
    title: 'Lights Out',
    blurb: 'Toggle every light off.',
    icon: Lightbulb,
    difficulty: 'medium',
    Component: LightsPuzzle,
  },
  {
    id: 'hanoi',
    title: 'Tower Shift',
    blurb: 'Move the stack to the right peg.',
    icon: Layers,
    difficulty: 'medium',
    Component: HanoiPuzzle,
  },
  {
    id: 'safe',
    title: 'Safe Crack',
    blurb: 'Guess the digit code with ↑↓ hints.',
    icon: Lock,
    difficulty: 'medium',
    Component: SafePuzzle,
  },

  // +4m hard
  {
    id: 'countdown',
    title: 'Exact Hit',
    blurb: 'Build an expression that hits the target.',
    icon: Hash,
    difficulty: 'hard',
    Component: CountdownPuzzle,
  },
  {
    id: 'nback',
    title: 'N-Back',
    blurb: 'Working memory. Same as N ago?',
    icon: FlipHorizontal2,
    difficulty: 'hard',
    Component: NBackPuzzle,
  },
  {
    id: 'slider',
    title: 'Slide Rank',
    blurb: 'Restore the numbered board.',
    icon: Puzzle,
    difficulty: 'hard',
    Component: SliderPuzzle,
  },
  {
    id: 'sudoku',
    title: 'Quadoku',
    blurb: '4×4 sudoku with conflict misses.',
    icon: Grid3x3,
    difficulty: 'hard',
    Component: SudokuPuzzle,
  },
  {
    id: 'sumgrid',
    title: 'Sum Cage',
    blurb: 'Fill so every row and column hits.',
    icon: Hash,
    difficulty: 'hard',
    Component: SumGridPuzzle,
  },
  {
    id: 'mastermind',
    title: 'Code Break',
    blurb: 'Classic color Mastermind.',
    icon: SpellCheck,
    difficulty: 'hard',
    Component: MastermindPuzzle,
  },
];

export function EarnScreen() {
  const { state, puzzleRemaining, earnPuzzle } = useScreel();
  const { toast } = useScreelUI();
  const [active, setActive] = useState<(typeof CATALOG)[number] | null>(null);

  const finish = (ok: boolean) => {
    if (!active) return;
    if (!ok) {
      void hapticWarning();
      toast('Try again when you are ready.', { title: 'Puzzle missed', tone: 'warn' });
      setActive(null);
      return;
    }
    const reward = PUZZLE_REWARDS[active.difficulty];
    const credited = earnPuzzle({
      puzzleId: active.id,
      reward,
      detail: `${active.title} cleared`,
    });
    if (credited < 1) {
      toast(
        puzzleRemaining < 1
          ? `Daily puzzle cap reached (${PUZZLE_DAILY_CAP}m).`
          : 'Short cooldown. Wait a moment before the next clear.',
        { title: 'No minutes credited', tone: 'info' },
      );
    } else {
      void hapticSuccess();
      toast(`+${credited}m added to your allowance.`, {
        title: `${active.title} cleared`,
        tone: 'success',
      });
    }
    setActive(null);
  };

  if (active) {
    const ActivePuzzle = active.Component;
    return (
      <div className="screen earn-screen">
        <div className="game-top earn-puzzle-top">
          <button type="button" className="back-btn" onClick={() => setActive(null)}>
            Back to Earn
          </button>
          <span className="game-title-chip">Earn</span>
          <span aria-hidden />
        </div>
        <h1 className="display md">{active.title}</h1>
        <p className="lede">No stake. Fixed reward. Cap {PUZZLE_DAILY_CAP}m/day.</p>
        <ActivePuzzle
          difficulty={active.difficulty}
          onClear={() => finish(true)}
          onFail={() => finish(false)}
        />
      </div>
    );
  }

  const pct = Math.min(100, (state.puzzleEarnedToday / PUZZLE_DAILY_CAP) * 100);
  const groups: Diff[] = ['easy', 'medium', 'hard'];

  return (
    <div className="screen earn-screen">
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Regain minutes</div>
        <h1 className="display lg">Earn</h1>
        <p className="lede">
          Skill puzzles pay fixed minutes: easy +2m, medium +3m, hard +4m. No stakes. Cap {PUZZLE_DAILY_CAP}m
          per day. For winning or losing minutes on purpose, use Play.
        </p>
      </motion.div>

      <div className="earn-hero section">
        <div className="hero-stat">
          <span className="k">Earned from puzzles today</span>
          <span className="v pos">+{state.puzzleEarnedToday}m</span>
        </div>
        <div className="budget-meter" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="meter-meta">
          <span>{puzzleRemaining}m left under today&apos;s cap</span>
          <span>{PUZZLE_DAILY_CAP}m max</span>
        </div>
      </div>

      {groups.map((diff, gi) => {
        const items = CATALOG.filter((c) => c.difficulty === diff);
        return (
          <section key={diff} className="section">
            <div className="section-head">
              <h2>
                <span className="idx">{String(gi + 1).padStart(2, '0')}</span>{' '}
                {diff.charAt(0).toUpperCase() + diff.slice(1)} +{PUZZLE_REWARDS[diff]}m
              </h2>
            </div>
            <div className="earn-catalog">
              {items.map((item) => {
                const Icon = item.icon;
                const reward = PUZZLE_REWARDS[item.difficulty];
                const disabled = puzzleRemaining < 1;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="earn-card"
                    disabled={disabled}
                    onClick={() => setActive(item)}
                  >
                    <div className="earn-card-icon">
                      <Icon size={18} />
                    </div>
                    <div className="earn-card-copy">
                      <h3>{item.title}</h3>
                      <p>{item.blurb}</p>
                    </div>
                    <span className="pill live">+{reward}m</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
