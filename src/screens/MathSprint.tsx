import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { PotTicker } from '../components/PotTicker';
import { useScreel } from '../context/ScreelContext';
import { GAME_REWARDS } from '../types';

const NEED = 10;
const SECONDS = 30;
const REWARD = GAME_REWARDS.math;

type Stage = 'ready' | 'live' | 'done';

function makeProblem(): { a: number; b: number; op: '+' | '-'; answer: number } {
  const op: '+' | '-' = Math.random() < 0.55 ? '+' : '-';
  if (op === '+') {
    const a = 2 + Math.floor(Math.random() * 18);
    const b = 2 + Math.floor(Math.random() * 18);
    return { a, b, op, answer: a + b };
  }
  const a = 8 + Math.floor(Math.random() * 22);
  const b = 1 + Math.floor(Math.random() * Math.min(12, a - 1));
  return { a, b, op, answer: a - b };
}

export function MathSprint({ onBack }: { onBack: () => void }) {
  const { remaining, earnLeftToday, settleRound } = useScreel();
  const [stage, setStage] = useState<Stage>('ready');
  const [problem, setProblem] = useState(() => makeProblem());
  const [choices, setChoices] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [banner, setBanner] = useState<{ text: string; kind: 'win' | 'lose' } | null>(null);

  useEffect(() => {
    if (stage !== 'live') return;
    if (left <= 0) {
      finish(false, 'Time up');
      return;
    }
    const id = window.setTimeout(() => setLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, left]);

  const shuffleChoices = (answer: number) => {
    const set = new Set<number>([answer]);
    while (set.size < 4) {
      const noise = answer + (Math.floor(Math.random() * 11) - 5);
      if (noise !== answer && noise >= 0) set.add(noise);
    }
    return Array.from(set).sort(() => Math.random() - 0.5);
  };

  const start = () => {
    const p = makeProblem();
    setProblem(p);
    setChoices(shuffleChoices(p.answer));
    setCorrect(0);
    setLeft(SECONDS);
    setBanner(null);
    setStage('live');
  };

  const finish = (success: boolean, detail: string) => {
    const applied = settleRound({
      game: 'math',
      delta: success ? REWARD : 0,
      detail,
      result: success ? 'win' : 'lose',
    });
    setStage('done');
    setBanner({
      text: success
        ? applied > 0
          ? `${NEED} correct! +${applied}m`
          : 'Cleared — keep cap full today.'
        : `${detail}. Skill challenge — bank unchanged.`,
      kind: success ? 'win' : 'lose',
    });
  };

  const pick = (n: number) => {
    if (stage !== 'live') return;
    if (n !== problem.answer) {
      finish(false, `Wrong answer after ${correct} correct`);
      return;
    }
    const next = correct + 1;
    setCorrect(next);
    if (next >= NEED) {
      finish(true, `${NEED} correct in ${SECONDS - left}s`);
      return;
    }
    const p = makeProblem();
    setProblem(p);
    setChoices(shuffleChoices(p.answer));
  };

  return (
    <div className="screen game-stage">
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={stage === 'live'}>
          <ArrowLeft size={16} /> Play
        </button>
        <div className="bj-balance">
          <span>Minutes left</span>
          <strong>{remaining}m</strong>
        </div>
      </div>

      <PotTicker pot={REWARD} earnLeft={earnLeftToday} label="Skill bonus" />

      <div className="math-stage">
        <div className="mines-meta" style={{ marginBottom: 12 }}>
          <div className="stat-tile">
            <div className="label">Correct</div>
            <div className="value">
              {correct}/{NEED}
            </div>
          </div>
          <div className="stat-tile">
            <div className="label">Time</div>
            <div className="value">{stage === 'live' ? `${left}s` : `${SECONDS}s`}</div>
          </div>
        </div>

        {stage === 'live' ? (
          <>
            <div className="math-problem">
              {problem.a} {problem.op} {problem.b}
            </div>
            <div className="math-choices">
              {choices.map((n) => (
                <button key={n} type="button" className="btn btn-secondary" onClick={() => pick(n)}>
                  {n}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="lede" style={{ textAlign: 'center', maxWidth: '32ch', margin: '0 auto' }}>
            Answer {NEED} quick arithmetic questions in {SECONDS} seconds. Pure skill — miss and nothing is
            taken from your bank.
          </p>
        )}
      </div>

      <AnimatePresence>
        {banner && (
          <motion.div
            className={`result-banner ${banner.kind}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {banner.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bj-dock">
        {(stage === 'ready' || stage === 'done') && (
          <button type="button" className="btn btn-primary btn-block" onClick={start}>
            {stage === 'done' ? 'Try again' : 'Start sprint'}
          </button>
        )}
      </div>
    </div>
  );
}
