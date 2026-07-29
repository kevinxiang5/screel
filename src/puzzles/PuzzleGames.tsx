import { useEffect, useMemo, useRef, useState } from 'react';
import { PUZZLE_REWARDS } from '../types';
import { canReach, keyOf, pick, randInt, shuffle } from './utils';

export type Diff = keyof typeof PUZZLE_REWARDS;

type PuzzleProps = {
  difficulty: Diff;
  onClear: () => void;
  onFail: () => void;
};

function missCap(diff: Diff, easy = 3, medium = 2, hard = 2) {
  return diff === 'easy' ? easy : diff === 'medium' ? medium : hard;
}

/* ───────────────── Math ───────────────── */

function makeProblem(diff: Diff): { prompt: string; answer: number } {
  if (diff === 'easy') {
    const a = randInt(6, 18);
    const b = randInt(4, 14);
    return Math.random() > 0.45
      ? { prompt: `${a} × ${b}`, answer: a * b }
      : { prompt: `${a + b} − ${b}`, answer: a };
  }
  if (diff === 'medium') {
    const a = randInt(10, 28);
    const b = randInt(4, 12);
    const c = randInt(3, 9);
    const kind = randInt(0, 2);
    if (kind === 0) return { prompt: `(${a} + ${b}) × ${c}`, answer: (a + b) * c };
    if (kind === 1) return { prompt: `${a * b} ÷ ${b}`, answer: a };
    return { prompt: `${a} × ${b} − ${c}`, answer: a * b - c };
  }
  const a = randInt(12, 36);
  const b = randInt(3, 11);
  const c = randInt(2, 9);
  const d = randInt(2, 7);
  const kind = randInt(0, 3);
  if (kind === 0) return { prompt: `(${a} − ${b}) × ${c} + ${d}`, answer: (a - b) * c + d };
  if (kind === 1) return { prompt: `${a}² − ${b}`, answer: a * a - b };
  if (kind === 2) return { prompt: `(${a} × ${b}) ÷ ${b} × ${c}`, answer: a * c };
  return { prompt: `${a} × ${b} − ${c} × ${d}`, answer: a * b - c * d };
}

export function MathPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const need = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
  const missLimit = missCap(difficulty, 3, 3, 2);
  const [streak, setStreak] = useState(0);
  const [problem, setProblem] = useState(() => makeProblem(difficulty));
  const [input, setInput] = useState('');
  const [misses, setMisses] = useState(0);

  const submit = () => {
    const n = Number(input.trim());
    if (!Number.isFinite(n)) return;
    if (n === problem.answer) {
      const next = streak + 1;
      if (next >= need) {
        onClear();
        return;
      }
      setStreak(next);
      setProblem(makeProblem(difficulty));
      setInput('');
      return;
    }
    const nextMiss = misses + 1;
    setMisses(nextMiss);
    setInput('');
    setProblem(makeProblem(difficulty));
    setStreak(0);
    if (nextMiss >= missLimit) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        {need} correct in a row. Miss resets streak. Misses {misses}/{missLimit} · Streak {streak}/
        {need}
      </p>
      <div className="puzzle-prompt">{problem.prompt}</div>
      <input
        className="name-input"
        inputMode="numeric"
        value={input}
        placeholder="Answer"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Check
      </button>
    </div>
  );
}

/* ───────────────── Pattern ───────────────── */

const PATTERN_COLORS = ['#6ec8ff', '#e8c36a', '#ff6b5a', '#9ae6b4', '#c4a1ff', '#ff9f43'];

export function PatternPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const colorCount = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
  const len = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 7;
  const flash = difficulty === 'hard' ? 300 : difficulty === 'medium' ? 360 : 420;
  const colors = PATTERN_COLORS.slice(0, colorCount);
  const sequence = useMemo(
    () => Array.from({ length: len }, () => randInt(0, colorCount - 1)),
    [len, colorCount],
  );
  const [phase, setPhase] = useState<'show' | 'input'>('show');
  const [lit, setLit] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const playing = useRef(false);

  const play = async () => {
    if (playing.current) return;
    playing.current = true;
    setStarted(true);
    setPhase('show');
    setStep(0);
    for (let i = 0; i < sequence.length; i += 1) {
      setLit(sequence[i]!);
      await new Promise((r) => setTimeout(r, flash));
      setLit(null);
      await new Promise((r) => setTimeout(r, 140));
    }
    setPhase('input');
    playing.current = false;
  };

  const tap = (idx: number) => {
    if (phase !== 'input') return;
    if (sequence[step] !== idx) {
      onFail();
      return;
    }
    const next = step + 1;
    if (next >= sequence.length) {
      onClear();
      return;
    }
    setStep(next);
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Memorize {len} pulses across {colorCount} pads. One miss fails.
      </p>
      {!started ? (
        <button type="button" className="btn btn-primary btn-block" onClick={() => void play()}>
          Show pattern
        </button>
      ) : (
        <p className="rl-hint">{phase === 'show' ? 'Memorize…' : `Tap ${step + 1}/${len}`}</p>
      )}
      <div
        className="pattern-grid"
        style={{ gridTemplateColumns: `repeat(${colorCount <= 4 ? 2 : 3}, 1fr)` }}
      >
        {colors.map((color, i) => (
          <button
            key={color}
            type="button"
            className={`pattern-cell ${lit === i ? 'lit' : ''}`}
            style={{ ['--cell' as string]: color }}
            onClick={() => tap(i)}
            disabled={phase !== 'input'}
          />
        ))}
      </div>
    </div>
  );
}

/* ───────────────── Grid Lock ───────────────── */

export function GridPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const size = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
  const wallTarget = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 8 : 12;
  const walls = useMemo(() => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const set = new Set<string>();
      while (set.size < wallTarget) {
        const x = randInt(0, size - 1);
        const y = randInt(0, size - 1);
        if ((x === 0 && y === 0) || (x === size - 1 && y === size - 1)) continue;
        set.add(keyOf(x, y));
      }
      if (canReach(size, set, [0, 0], [size - 1, size - 1])) return set;
    }
    return new Set<string>();
  }, [size, wallTarget]);

  const [path, setPath] = useState<string[]>(['0,0']);
  const [resets, setResets] = useState(0);
  const resetLimit = difficulty === 'hard' ? 1 : 2;
  const current = path[path.length - 1]!;
  const [cx, cy] = current.split(',').map(Number) as [number, number];

  const tryMove = (x: number, y: number) => {
    const key = keyOf(x, y);
    if (walls.has(key)) {
      onFail();
      return;
    }
    if (Math.abs(x - cx) + Math.abs(y - cy) !== 1) return;
    if (path.includes(key)) return;
    const next = [...path, key];
    setPath(next);
    if (x === size - 1 && y === size - 1) onClear();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Path S→E. Walls fail instantly. Resets {resets}/{resetLimit}.
      </p>
      <div className="gridlock" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {Array.from({ length: size * size }, (_, i) => {
          const x = i % size;
          const y = Math.floor(i / size);
          const key = keyOf(x, y);
          const isWall = walls.has(key);
          const onPath = path.includes(key);
          const isStart = x === 0 && y === 0;
          const isEnd = x === size - 1 && y === size - 1;
          return (
            <button
              key={key}
              type="button"
              className={`gridlock-cell ${isWall ? 'wall' : ''} ${onPath ? 'path' : ''}`}
              onClick={() => tryMove(x, y)}
            >
              {isStart ? 'S' : isEnd ? 'E' : ''}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={() => {
          if (resets >= resetLimit) {
            onFail();
            return;
          }
          setResets((r) => r + 1);
          setPath(['0,0']);
        }}
      >
        Reset path ({resetLimit - resets} left)
      </button>
    </div>
  );
}

/* ───────────────── Number sequence ───────────────── */

function makeSequence(diff: Diff): { shown: number[]; answer: number; hint: string } {
  const kinds =
    diff === 'easy' ? [0, 1] : diff === 'medium' ? [0, 1, 2, 3] : [0, 1, 2, 3, 4, 5];
  const kind = pick(kinds);
  if (kind === 0) {
    const a = randInt(2, diff === 'hard' ? 9 : 6);
    const start = randInt(3, 12);
    const seq = Array.from({ length: 5 }, (_, i) => start + i * a);
    return { shown: seq.slice(0, 4), answer: seq[4]!, hint: 'Arithmetic (+)' };
  }
  if (kind === 1) {
    const r = randInt(2, 3);
    let n = randInt(2, 5);
    const seq = [n];
    for (let i = 0; i < 4; i += 1) {
      n *= r;
      seq.push(n);
    }
    return { shown: seq.slice(0, 4), answer: seq[4]!, hint: 'Geometric (×)' };
  }
  if (kind === 2) {
    let a = randInt(1, 4);
    let b = randInt(2, 5);
    const seq = [a, b];
    for (let i = 0; i < 3; i += 1) {
      const n = a + b;
      seq.push(n);
      a = b;
      b = n;
    }
    return { shown: seq.slice(0, 4), answer: seq[4]!, hint: 'Each term = sum of prior two' };
  }
  if (kind === 3) {
    const start = randInt(2, 8);
    const seq = Array.from({ length: 5 }, (_, i) => start + i * i);
    return { shown: seq.slice(0, 4), answer: seq[4]!, hint: 'Add square index' };
  }
  if (kind === 4) {
    const start = randInt(20, 50);
    const seq = Array.from({ length: 5 }, (_, i) => start - i * (i + 1));
    return { shown: seq.slice(0, 4), answer: seq[4]!, hint: 'Subtract triangular numbers' };
  }
  const base = randInt(3, 9);
  const seq = Array.from({ length: 5 }, (_, i) => base * (i + 1) + (i % 2 === 0 ? 1 : -1));
  return { shown: seq.slice(0, 4), answer: seq[4]!, hint: 'Alternating ±1 on multiples' };
}

export function SequencePuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const need = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
  const missLimit = missCap(difficulty);
  const showHint = difficulty !== 'hard';
  const [streak, setStreak] = useState(0);
  const [misses, setMisses] = useState(0);
  const [item, setItem] = useState(() => makeSequence(difficulty));
  const [input, setInput] = useState('');

  const submit = () => {
    const n = Number(input.trim());
    if (!Number.isFinite(n)) return;
    if (n === item.answer) {
      const next = streak + 1;
      if (next >= need) {
        onClear();
        return;
      }
      setStreak(next);
      setItem(makeSequence(difficulty));
      setInput('');
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setStreak(0);
    setInput('');
    setItem(makeSequence(difficulty));
    if (m >= missLimit) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Find the next term. {need} clears · Misses {misses}/{missLimit} · Streak {streak}/{need}
      </p>
      <div className="puzzle-prompt">{item.shown.join(', ')}, ?</div>
      {showHint ? <p className="rl-hint">{item.hint}</p> : null}
      <input
        className="name-input"
        inputMode="numeric"
        value={input}
        placeholder="Next number"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Check
      </button>
    </div>
  );
}

/* ───────────────── Stroop ───────────────── */

const STROOP = [
  { name: 'LIME', ink: '#c8ff2e' },
  { name: 'CORAL', ink: '#ff4b2b' },
  { name: 'GOLD', ink: '#f0c94d' },
  { name: 'SKY', ink: '#6ec8ff' },
  { name: 'VIOLET', ink: '#c4a1ff' },
] as const;

export function StroopPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const need = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 10 : 12;
  const missLimit = missCap(difficulty);
  const [streak, setStreak] = useState(0);
  const [misses, setMisses] = useState(0);
  const make = () => {
    const word = pick(STROOP);
    let ink = pick(STROOP);
    while (ink.name === word.name) ink = pick(STROOP);
    return { word: word.name, ink: ink.ink, answer: ink.name };
  };
  const [card, setCard] = useState(make);

  const choose = (name: string) => {
    if (name === card.answer) {
      const next = streak + 1;
      if (next >= need) {
        onClear();
        return;
      }
      setStreak(next);
      setCard(make());
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setStreak(0);
    setCard(make());
    if (m >= missLimit) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Tap the INK color, not the word. {streak}/{need} · Misses {misses}/{missLimit}
      </p>
      <div className="puzzle-prompt" style={{ color: card.ink }}>
        {card.word}
      </div>
      <div className="puzzle-choice-row">
        {STROOP.map((c) => (
          <button
            key={c.name}
            type="button"
            className="btn btn-secondary"
            style={{ borderColor: c.ink, color: c.ink }}
            onClick={() => choose(c.name)}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────── Binary ───────────────── */

export function BinaryPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const bits = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 6 : 8;
  const need = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
  const missLimit = missCap(difficulty);
  const make = () => {
    const min = 1 << Math.max(2, bits - 3);
    const n = randInt(min, (1 << bits) - 1);
    return { bin: n.toString(2).padStart(bits, '0'), answer: n };
  };
  const [streak, setStreak] = useState(0);
  const [misses, setMisses] = useState(0);
  const [item, setItem] = useState(make);
  const [input, setInput] = useState('');

  const submit = () => {
    const n = Number(input.trim());
    if (!Number.isFinite(n)) return;
    if (n === item.answer) {
      const next = streak + 1;
      if (next >= need) {
        onClear();
        return;
      }
      setStreak(next);
      setItem(make());
      setInput('');
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setStreak(0);
    setInput('');
    setItem(make());
    if (m >= missLimit) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Decimal from binary. {streak}/{need} · Misses {misses}/{missLimit}
      </p>
      <div className="puzzle-prompt puzzle-mono">{item.bin}</div>
      <input
        className="name-input"
        inputMode="numeric"
        value={input}
        placeholder="Decimal"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Check
      </button>
    </div>
  );
}

/* ───────────────── Cipher ───────────────── */

const CIPHER_WORDS = [
  'FOCUS',
  'BUDGET',
  'STREAK',
  'LOCKIN',
  'MINUTE',
  'SIGNAL',
  'FILTER',
  'ANCHOR',
  'HABIT',
  'RITUAL',
  'DEPTH',
  'CLARITY',
];

export function CipherPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const need = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
  const missLimit = missCap(difficulty);
  const make = () => {
    const word = pick(CIPHER_WORDS);
    const shift = difficulty === 'easy' ? randInt(1, 5) : randInt(3, 13);
    const encoded = word
      .split('')
      .map((ch) => {
        const code = ch.charCodeAt(0) - 65;
        return String.fromCharCode(((code + shift) % 26) + 65);
      })
      .join('');
    return { encoded, answer: word, shift };
  };
  const [streak, setStreak] = useState(0);
  const [misses, setMisses] = useState(0);
  const [item, setItem] = useState(make);
  const [input, setInput] = useState('');

  const submit = () => {
    if (input.trim().toUpperCase().replace(/\s+/g, '') === item.answer) {
      const next = streak + 1;
      if (next >= need) {
        onClear();
        return;
      }
      setStreak(next);
      setItem(make());
      setInput('');
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setStreak(0);
    setInput('');
    setItem(make());
    if (m >= missLimit) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Caesar shift +{item.shift}. Decode {need} words. {streak}/{need} · Misses {misses}/
        {missLimit}
      </p>
      <div className="puzzle-prompt puzzle-mono">{item.encoded}</div>
      <input
        className="name-input"
        value={input}
        placeholder="Plaintext"
        autoCapitalize="characters"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Check
      </button>
    </div>
  );
}

/* ───────────────── Memory match ───────────────── */

export function MemoryPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const pairs = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
  const missLimit = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 6 : 5;
  const glyphs = ['♠', '♥', '♦', '♣', '★', '◆', '●', '▲'].slice(0, pairs);
  const deck = useMemo(
    () => shuffle([...glyphs, ...glyphs].map((g, i) => ({ id: i, g }))),
    // glyphs derived from pairs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pairs],
  );
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [misses, setMisses] = useState(0);
  const lock = useRef(false);
  const done = useRef(false);

  const flip = (idx: number) => {
    if (done.current || lock.current) return;
    if (open.includes(idx)) return;
    if (matched.has(deck[idx]!.g)) return;
    const next = [...open, idx];
    setOpen(next);
    if (next.length < 2) return;
    const [a, b] = next;
    if (deck[a!]!.g === deck[b!]!.g) {
      const m = new Set(matched);
      m.add(deck[a!]!.g);
      setMatched(m);
      setOpen([]);
      if (m.size >= pairs) {
        done.current = true;
        onClear();
      }
      return;
    }
    lock.current = true;
    window.setTimeout(() => {
      setOpen([]);
      lock.current = false;
      setMisses((m) => {
        const n = m + 1;
        if (n >= missLimit) {
          done.current = true;
          onFail();
        }
        return n;
      });
    }, 550);
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Match all pairs. Misses {misses}/{missLimit}
      </p>
      <div className="memory-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {deck.map((card, i) => {
          const show = open.includes(i) || matched.has(card.g);
          return (
            <button
              key={card.id}
              type="button"
              className={`memory-card ${show ? 'open' : ''} ${matched.has(card.g) ? 'matched' : ''}`}
              onClick={() => flip(i)}
            >
              {show ? card.g : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────── N-back ───────────────── */

export function NBackPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const n = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
  const need = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;
  const missLimit = missCap(difficulty, 3, 3, 2);
  const alphabet = 'ABCDEFGHJKLMNPRSTUV'.split('');
  const [stream, setStream] = useState(() => Array.from({ length: n }, () => pick(alphabet)));
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    const t = window.setTimeout(() => setReady(true), 350);
    return () => window.clearTimeout(t);
  }, [stream, started]);

  const start = () => {
    setStream((s) => [...s, pick(alphabet)]);
    setStarted(true);
    setReady(false);
  };

  const current = stream[stream.length - 1]!;
  const target = stream.length > n ? stream[stream.length - 1 - n]! : null;
  const isMatch = target !== null && target === current;

  const answer = (same: boolean) => {
    if (!ready || target === null) return;
    if (same === isMatch) {
      const next = hits + 1;
      if (next >= need) {
        onClear();
        return;
      }
      setHits(next);
    } else {
      const m = misses + 1;
      setMisses(m);
      if (m >= missLimit) {
        onFail();
        return;
      }
    }
    setStream((s) => [...s.slice(-14), pick(alphabet)]);
    setReady(false);
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        {n}-back. Same letter as {n} step{n > 1 ? 's' : ''} ago? Hits {hits}/{need} · Misses{' '}
        {misses}/{missLimit}
      </p>
      {!started ? (
        <button type="button" className="btn btn-primary btn-block" onClick={start}>
          Start stream
        </button>
      ) : (
        <>
          <div className="puzzle-prompt">{current}</div>
          <div className="puzzle-choice-row">
            <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => answer(true)}>
              Same
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={!ready}
              onClick={() => answer(false)}
            >
              Different
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────── Lights Out ───────────────── */

function toggleLights(grid: boolean[], size: number, idx: number) {
  const next = [...grid];
  const x = idx % size;
  const y = Math.floor(idx / size);
  for (const [dx, dy] of [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
    const i = ny * size + nx;
    next[i] = !next[i];
  }
  return next;
}

export function LightsPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const size = difficulty === 'hard' ? 5 : 4;
  const moveCap = difficulty === 'easy' ? 24 : difficulty === 'medium' ? 20 : 28;
  const [grid, setGrid] = useState(() => {
    let g = Array.from({ length: size * size }, () => false);
    const presses = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 10;
    for (let i = 0; i < presses; i += 1) g = toggleLights(g, size, randInt(0, size * size - 1));
    if (g.every((v) => !v)) g = toggleLights(g, size, 0);
    return g;
  });
  const [moves, setMoves] = useState(0);

  const press = (idx: number) => {
    const next = toggleLights(grid, size, idx);
    const m = moves + 1;
    setGrid(next);
    setMoves(m);
    if (next.every((v) => !v)) {
      onClear();
      return;
    }
    if (m >= moveCap) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Turn every light off. Moves {moves}/{moveCap}
      </p>
      <div className="gridlock" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {grid.map((on, i) => (
          <button
            key={i}
            type="button"
            className={`gridlock-cell ${on ? 'path' : 'wall'}`}
            onClick={() => press(i)}
          />
        ))}
      </div>
    </div>
  );
}

/* ───────────────── Sliding puzzle ───────────────── */

function slidingSolved(size: number) {
  return Array.from({ length: size * size }, (_, i) => (i === size * size - 1 ? 0 : i + 1));
}

function slide(board: number[], size: number, idx: number): number[] | null {
  const blank = board.indexOf(0);
  const bx = blank % size;
  const by = Math.floor(blank / size);
  const x = idx % size;
  const y = Math.floor(idx / size);
  if (Math.abs(x - bx) + Math.abs(y - by) !== 1) return null;
  const next = [...board];
  [next[blank], next[idx]] = [next[idx]!, next[blank]!];
  return next;
}

function scrambleBoard(size: number, steps: number) {
  let b = slidingSolved(size);
  let blank = size * size - 1;
  for (let i = 0; i < steps; i += 1) {
    const bx = blank % size;
    const by = Math.floor(blank / size);
    const opts: number[] = [];
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = bx + dx;
      const ny = by + dy;
      if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
      opts.push(ny * size + nx);
    }
    const pickIdx = pick(opts);
    const next = slide(b, size, pickIdx);
    if (next) {
      b = next;
      blank = pickIdx;
    }
  }
  return b;
}

export function SliderPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const size = difficulty === 'hard' ? 4 : 3;
  const scrambleSteps = difficulty === 'easy' ? 20 : difficulty === 'medium' ? 35 : 70;
  const moveCap = difficulty === 'easy' ? 50 : difficulty === 'medium' ? 70 : 120;
  const [board, setBoard] = useState(() => scrambleBoard(size, scrambleSteps));
  const [moves, setMoves] = useState(0);
  const goal = slidingSolved(size);

  const tap = (idx: number) => {
    const next = slide(board, size, idx);
    if (!next) return;
    const m = moves + 1;
    setBoard(next);
    setMoves(m);
    if (next.every((v, i) => v === goal[i])) {
      onClear();
      return;
    }
    if (m >= moveCap) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Slide tiles into order. Moves {moves}/{moveCap}
      </p>
      <div className="gridlock" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {board.map((v, i) => (
          <button
            key={i}
            type="button"
            className={`gridlock-cell ${v === 0 ? 'wall' : 'path'}`}
            onClick={() => tap(i)}
          >
            {v === 0 ? '' : v}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────── Mini Sudoku 4×4 ───────────────── */

function genSudoku4(hideCount: number): { board: number[]; given: boolean[] } {
  const base = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
  const map = shuffle([1, 2, 3, 4]);
  let solution = base.map((v) => map[v - 1]!);
  if (Math.random() > 0.5) {
    for (let c = 0; c < 4; c += 1) {
      const a = c;
      const b = 4 + c;
      [solution[a], solution[b]] = [solution[b]!, solution[a]!];
    }
  }
  if (Math.random() > 0.5) {
    for (let r = 0; r < 4; r += 1) {
      const a = r * 4;
      const b = r * 4 + 1;
      [solution[a], solution[b]] = [solution[b]!, solution[a]!];
      const c = r * 4 + 2;
      const d = r * 4 + 3;
      [solution[c], solution[d]] = [solution[d]!, solution[c]!];
    }
  }
  const given = solution.map(() => true);
  const idxs = shuffle(Array.from({ length: 16 }, (_, i) => i)).slice(0, hideCount);
  for (const i of idxs) given[i] = false;
  const board = solution.map((v, i) => (given[i] ? v : 0));
  return { board, given };
}

function validSudoku4(board: number[]) {
  const groups: number[][] = [];
  for (let r = 0; r < 4; r += 1) groups.push([0, 1, 2, 3].map((c) => board[r * 4 + c]!));
  for (let c = 0; c < 4; c += 1) groups.push([0, 1, 2, 3].map((r) => board[r * 4 + c]!));
  for (const br of [0, 2]) {
    for (const bc of [0, 2]) {
      const box: number[] = [];
      for (let r = 0; r < 2; r += 1)
        for (let c = 0; c < 2; c += 1) box.push(board[(br + r) * 4 + (bc + c)]!);
      groups.push(box);
    }
  }
  return (
    board.every((v) => v > 0) &&
    groups.every((g) => {
      const vals = g.filter((v) => v > 0);
      return vals.length === new Set(vals).size && vals.length === 4;
    })
  );
}

export function SudokuPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const hide = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 7 : 9;
  const puzzle = useMemo(() => genSudoku4(hide), [hide]);
  const [board, setBoard] = useState(puzzle.board);
  const [selected, setSelected] = useState<number | null>(() => puzzle.given.findIndex((g) => !g));
  const [misses, setMisses] = useState(0);
  const missLimit = missCap(difficulty);

  const place = (n: number) => {
    if (selected === null || puzzle.given[selected]) return;
    const next = [...board];
    next[selected] = n;
    const r = Math.floor(selected / 4);
    const c = selected % 4;
    let conflict = false;
    for (let i = 0; i < 4; i += 1) {
      if (i !== c && next[r * 4 + i] === n) conflict = true;
      if (i !== r && next[i * 4 + c] === n) conflict = true;
    }
    const br = r < 2 ? 0 : 2;
    const bc = c < 2 ? 0 : 2;
    for (let rr = 0; rr < 2; rr += 1)
      for (let cc = 0; cc < 2; cc += 1) {
        const idx = (br + rr) * 4 + (bc + cc);
        if (idx !== selected && next[idx] === n) conflict = true;
      }
    if (conflict) {
      const m = misses + 1;
      setMisses(m);
      next[selected] = 0;
      setBoard(next);
      if (m >= missLimit) onFail();
      return;
    }
    setBoard(next);
    if (next.every((v) => v > 0) && validSudoku4(next)) onClear();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Fill 1–4. No repeats in row, column, or 2×2. Misses {misses}/{missLimit}
      </p>
      <div className="gridlock sudoku-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {board.map((v, i) => (
          <button
            key={i}
            type="button"
            className={`gridlock-cell ${puzzle.given[i] ? 'wall' : ''} ${selected === i ? 'path' : ''}`}
            onClick={() => !puzzle.given[i] && setSelected(i)}
          >
            {v || ''}
          </button>
        ))}
      </div>
      <div className="puzzle-choice-row">
        {[1, 2, 3, 4].map((n) => (
          <button key={n} type="button" className="btn btn-secondary" onClick={() => place(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────── Sum grid ───────────────── */

export function SumGridPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const size = 3;
  const max = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
  const hints = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 2 : 1;
  const generated = useMemo(() => {
    const solution = Array.from({ length: size * size }, () => randInt(1, max));
    const rowSums = Array.from({ length: size }, (_, r) =>
      solution.slice(r * size, r * size + size).reduce((a, b) => a + b, 0),
    );
    const colSums = Array.from({ length: size }, (_, c) =>
      Array.from({ length: size }, (_, r) => solution[r * size + c]!).reduce((a, b) => a + b, 0),
    );
    const givenIdx = shuffle(Array.from({ length: size * size }, (_, i) => i)).slice(0, hints);
    const given = new Set(givenIdx);
    const start = solution.map((v, i) => (given.has(i) ? v : 0));
    return { rowSums, colSums, given, start };
  }, [max, hints]);

  const [board, setBoard] = useState(generated.start);
  const [selected, setSelected] = useState(() =>
    board.findIndex((_, i) => !generated.given.has(i)),
  );
  const [checks, setChecks] = useState(0);
  const checkLimit = missCap(difficulty);

  const place = (n: number) => {
    if (selected < 0 || generated.given.has(selected)) return;
    const next = [...board];
    next[selected] = n;
    setBoard(next);
  };

  const check = () => {
    const ok =
      board.every((v) => v > 0) &&
      generated.rowSums.every(
        (s, r) => board.slice(r * size, r * size + size).reduce((a, b) => a + b, 0) === s,
      ) &&
      generated.colSums.every(
        (s, c) =>
          Array.from({ length: size }, (_, r) => board[r * size + c]!).reduce((a, b) => a + b, 0) ===
          s,
      );
    if (ok) {
      onClear();
      return;
    }
    const m = checks + 1;
    setChecks(m);
    if (m >= checkLimit) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Fill cells so rows/cols hit the targets. Checks {checks}/{checkLimit}
      </p>
      <div className="sumgrid-wrap">
        <div className="gridlock" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
          {board.map((v, i) => (
            <button
              key={i}
              type="button"
              className={`gridlock-cell ${generated.given.has(i) ? 'wall' : ''} ${selected === i ? 'path' : ''}`}
              onClick={() => !generated.given.has(i) && setSelected(i)}
            >
              {v || ''}
            </button>
          ))}
        </div>
        <div className="sumgrid-rows">
          {generated.rowSums.map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
      </div>
      <div className="sumgrid-cols">
        {generated.colSums.map((s, i) => (
          <span key={i}>{s}</span>
        ))}
      </div>
      <div className="puzzle-choice-row">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" className="btn btn-secondary" onClick={() => place(n)}>
            {n}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={check}>
        Check board
      </button>
    </div>
  );
}

/* ───────────────── Countdown arithmetic ───────────────── */

type Op = '+' | '−' | '×' | '÷';

function evalLeftToRight(nums: number[], ops: Op[]): number | null {
  if (nums.length < 1) return null;
  if (ops.length !== nums.length - 1) return null;
  let v = nums[0]!;
  for (let i = 0; i < ops.length; i += 1) {
    const n = nums[i + 1]!;
    const op = ops[i]!;
    if (op === '+') v += n;
    else if (op === '−') v -= n;
    else if (op === '×') v *= n;
    else {
      if (n === 0 || v % n !== 0) return null;
      v /= n;
    }
  }
  return v;
}

function makeCountdown(diff: Diff): { nums: number[]; target: number } {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const count = diff === 'easy' ? 3 : 4;
    const nums = Array.from({ length: count }, () => randInt(2, diff === 'hard' ? 12 : 9));
    const ops: Op[] = [];
    for (let i = 0; i < count - 1; i += 1) {
      const choices: Op[] = diff === 'easy' ? ['+', '×'] : ['+', '−', '×'];
      ops.push(pick(choices));
    }
    const target = evalLeftToRight(nums, ops);
    if (target !== null && target >= 1 && target <= 400 && Number.isInteger(target)) {
      return { nums: shuffle(nums), target };
    }
  }
  return { nums: [3, 4, 5], target: 17 };
}

export function CountdownPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const puzzle = useMemo(() => makeCountdown(difficulty), [difficulty]);
  const [pool, setPool] = useState(puzzle.nums);
  const [expr, setExpr] = useState<number[]>([]);
  const [ops, setOps] = useState<Op[]>([]);
  const [misses, setMisses] = useState(0);
  const missLimit = missCap(difficulty);

  const pushNum = (n: number, idx: number) => {
    if (expr.length !== ops.length) return;
    setExpr((e) => [...e, n]);
    setPool((p) => p.filter((_, i) => i !== idx));
  };

  const pushOp = (op: Op) => {
    if (expr.length !== ops.length + 1) return;
    setOps((o) => [...o, op]);
  };

  const submit = () => {
    const v = evalLeftToRight(expr, ops);
    if (v === puzzle.target) {
      onClear();
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setExpr([]);
    setOps([]);
    setPool(puzzle.nums);
    if (m >= missLimit) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Hit exactly {puzzle.target} (left-to-right, no precedence). Misses {misses}/{missLimit}
      </p>
      <div className="puzzle-prompt">{puzzle.target}</div>
      <p className="rl-hint puzzle-mono">
        {expr.map((n, i) => `${n}${ops[i] ? ` ${ops[i]} ` : ''}`).join('') || 'Build expression'}
      </p>
      <div className="puzzle-choice-row">
        {pool.map((n, i) => (
          <button
            key={`${n}-${i}-${pool.join('.')}`}
            type="button"
            className="btn btn-secondary"
            onClick={() => pushNum(n, i)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="puzzle-choice-row">
        {(['+', '−', '×', '÷'] as const).map((op) => (
          <button key={op} type="button" className="btn btn-secondary" onClick={() => pushOp(op)}>
            {op}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Submit
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-block"
        onClick={() => {
          setExpr([]);
          setOps([]);
          setPool(puzzle.nums);
        }}
      >
        Clear
      </button>
    </div>
  );
}

/* ───────────────── Towers of Hanoi ───────────────── */

export function HanoiPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const disks = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 3 : 4;
  const moveCap = 2 ** disks - 1 + (difficulty === 'easy' ? 10 : difficulty === 'medium' ? 6 : 8);
  const [pegs, setPegs] = useState(() => [
    Array.from({ length: disks }, (_, i) => disks - i),
    [] as number[],
    [] as number[],
  ]);
  const [selected, setSelected] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);

  const tapPeg = (p: number) => {
    if (selected === null) {
      if (pegs[p]!.length === 0) return;
      setSelected(p);
      return;
    }
    if (selected === p) {
      setSelected(null);
      return;
    }
    const from = pegs[selected]!;
    const to = pegs[p]!;
    const disk = from[from.length - 1]!;
    if (to.length && to[to.length - 1]! < disk) {
      setSelected(null);
      return;
    }
    const next = pegs.map((peg) => [...peg]);
    next[selected] = from.slice(0, -1);
    next[p] = [...to, disk];
    const m = moves + 1;
    setPegs(next);
    setSelected(null);
    setMoves(m);
    if (next[2]!.length === disks) {
      onClear();
      return;
    }
    if (m >= moveCap) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Move stack to the right peg. Moves {moves}/{moveCap}
      </p>
      <div className="hanoi-board">
        {pegs.map((peg, pi) => (
          <button
            key={pi}
            type="button"
            className={`hanoi-peg ${selected === pi ? 'selected' : ''}`}
            onClick={() => tapPeg(pi)}
          >
            <div className="hanoi-pole" />
            <div className="hanoi-stack">
              {peg.map((d) => (
                <span key={d} className="hanoi-disk" style={{ width: `${28 + d * 16}%` }}>
                  {d}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────── Mastermind ───────────────── */

const MM_COLORS = ['#ff4b2b', '#c8ff2e', '#6ec8ff', '#f0c94d', '#c4a1ff', '#ff9f43'];

export function MastermindPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const len = difficulty === 'easy' ? 3 : 4;
  const colorCount = difficulty === 'hard' ? 6 : 5;
  const guessesMax = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 8 : 7;
  const colors = MM_COLORS.slice(0, colorCount);
  const secret = useMemo(
    () => Array.from({ length: len }, () => randInt(0, colorCount - 1)),
    [len, colorCount],
  );
  const [guess, setGuess] = useState<number[]>([]);
  const [history, setHistory] = useState<{ g: number[]; black: number; white: number }[]>([]);

  const push = (c: number) => {
    if (guess.length >= len) return;
    setGuess((g) => [...g, c]);
  };

  const submit = () => {
    if (guess.length < len) return;
    const secretLeft = [...secret];
    const guessLeft = [...guess];
    let black = 0;
    for (let i = 0; i < len; i += 1) {
      if (guessLeft[i] === secretLeft[i]) {
        black += 1;
        secretLeft[i] = -1;
        guessLeft[i] = -2;
      }
    }
    let white = 0;
    for (let i = 0; i < len; i += 1) {
      if (guessLeft[i]! < 0) continue;
      const j = secretLeft.indexOf(guessLeft[i]!);
      if (j >= 0) {
        white += 1;
        secretLeft[j] = -1;
      }
    }
    const next = [...history, { g: guess, black, white }];
    setHistory(next);
    setGuess([]);
    if (black === len) {
      onClear();
      return;
    }
    if (next.length >= guessesMax) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Crack the {len}-color code. Exact ● · wrong spot ○. Guesses {history.length}/{guessesMax}
      </p>
      <div className="mm-history">
        {history.map((h, i) => (
          <div key={i} className="mm-row">
            <div className="mm-pegs">
              {h.g.map((c, j) => (
                <span key={j} className="mm-peg" style={{ background: colors[c] }} />
              ))}
            </div>
            <span className="rl-hint">
              ●{h.black} ○{h.white}
            </span>
          </div>
        ))}
      </div>
      <div className="mm-pegs">
        {Array.from({ length: len }, (_, i) => (
          <span
            key={i}
            className="mm-peg"
            style={{ background: guess[i] !== undefined ? colors[guess[i]!] : 'transparent' }}
          />
        ))}
      </div>
      <div className="puzzle-choice-row">
        {colors.map((c, i) => (
          <button
            key={c}
            type="button"
            className="mm-peg btn"
            style={{ background: c }}
            onClick={() => push(i)}
          />
        ))}
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Guess
      </button>
      <button type="button" className="btn btn-secondary btn-block" onClick={() => setGuess([])}>
        Clear guess
      </button>
    </div>
  );
}

/* ───────────────── Odd one out ───────────────── */

export function OddOnePuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const size = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
  const need = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
  const missLimit = missCap(difficulty);
  const [streak, setStreak] = useState(0);
  const [misses, setMisses] = useState(0);
  const make = () => {
    const baseHue = randInt(0, 360);
    const odd = randInt(0, size * size - 1);
    const delta = difficulty === 'hard' ? 10 : difficulty === 'medium' ? 16 : 28;
    return { baseHue, odd, delta };
  };
  const [item, setItem] = useState(make);

  const tap = (idx: number) => {
    if (idx === item.odd) {
      const next = streak + 1;
      if (next >= need) {
        onClear();
        return;
      }
      setStreak(next);
      setItem(make());
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setStreak(0);
    setItem(make());
    if (m >= missLimit) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Find the odd tile. {streak}/{need} · Misses {misses}/{missLimit}
      </p>
      <div className="gridlock" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {Array.from({ length: size * size }, (_, i) => {
          const hue = i === item.odd ? (item.baseHue + item.delta) % 360 : item.baseHue;
          return (
            <button
              key={`${item.baseHue}-${item.odd}-${i}`}
              type="button"
              className="gridlock-cell"
              style={{ background: `hsl(${hue} 55% 42%)`, border: 'none' }}
              onClick={() => tap(i)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────── Order rush ───────────────── */

export function OrderPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const n = difficulty === 'easy' ? 9 : difficulty === 'medium' ? 12 : 16;
  const seconds = difficulty === 'easy' ? 22 : difficulty === 'medium' ? 18 : 15;
  const order = useMemo(() => shuffle(Array.from({ length: n }, (_, i) => i + 1)), [n]);
  const [next, setNext] = useState(1);
  const [left, setLeft] = useState(seconds);
  const done = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (done.current) return s;
        if (s <= 1) {
          window.clearInterval(id);
          done.current = true;
          onFail();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [onFail]);

  const tap = (v: number) => {
    if (done.current) return;
    if (v !== next) {
      done.current = true;
      onFail();
      return;
    }
    if (v === n) {
      done.current = true;
      onClear();
      return;
    }
    setNext(v + 1);
  };

  const cols = n <= 9 ? 3 : 4;

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Tap 1→{n} in order. Next {next} · {left}s
      </p>
      <div className="gridlock" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {order.map((v) => (
          <button
            key={v}
            type="button"
            className={`gridlock-cell ${v < next ? 'wall' : 'path'}`}
            onClick={() => tap(v)}
            disabled={v < next}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────── Word scramble ───────────────── */

const SCRAMBLE_EASY = ['FOCUS', 'HABIT', 'LOCK', 'TIME', 'PLAN', 'GOAL'];
const SCRAMBLE_MED = ['BUDGET', 'STREAK', 'FILTER', 'ANCHOR', 'SIGNAL', 'MINUTE'];
const SCRAMBLE_HARD = [
  'DISCIPLINE',
  'WILLPOWER',
  'ATTENTION',
  'RESTRAINT',
  'PERSISTENCE',
  'AWARENESS',
];

export function ScramblePuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const need = difficulty === 'easy' ? 2 : difficulty === 'medium' ? 3 : 4;
  const missLimit = missCap(difficulty);
  const pool =
    difficulty === 'easy' ? SCRAMBLE_EASY : difficulty === 'medium' ? SCRAMBLE_MED : SCRAMBLE_HARD;
  const make = () => {
    const word = pick(pool);
    let scrambled = shuffle(word.split('')).join('');
    let guard = 0;
    while (scrambled === word && guard < 20) {
      scrambled = shuffle(word.split('')).join('');
      guard += 1;
    }
    return { word, scrambled };
  };
  const [streak, setStreak] = useState(0);
  const [misses, setMisses] = useState(0);
  const [item, setItem] = useState(make);
  const [input, setInput] = useState('');

  const submit = () => {
    if (input.trim().toUpperCase().replace(/\s+/g, '') === item.word) {
      const next = streak + 1;
      if (next >= need) {
        onClear();
        return;
      }
      setStreak(next);
      setItem(make());
      setInput('');
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setStreak(0);
    setInput('');
    setItem(make());
    if (m >= missLimit) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Unscramble. {streak}/{need} · Misses {misses}/{missLimit}
      </p>
      <div className="puzzle-prompt puzzle-mono">{item.scrambled}</div>
      <input
        className="name-input"
        value={input}
        placeholder="Word"
        autoCapitalize="characters"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Check
      </button>
    </div>
  );
}

/* ───────────────── Equation missing number ───────────────── */

function makeEquation(diff: Diff): { prompt: string; answer: number } {
  if (diff === 'easy') {
    const a = randInt(4, 12);
    const b = randInt(3, 9);
    return Math.random() > 0.5
      ? { prompt: `${a} + ? = ${a + b}`, answer: b }
      : { prompt: `${a} × ? = ${a * b}`, answer: b };
  }
  if (diff === 'medium') {
    const a = randInt(6, 16);
    const b = randInt(3, 10);
    const c = randInt(2, 8);
    return Math.random() > 0.5
      ? { prompt: `${a} × ? + ${c} = ${a * b + c}`, answer: b }
      : { prompt: `(? + ${b}) × ${c} = ${(a + b) * c}`, answer: a };
  }
  const kind = randInt(0, 3);
  if (kind === 0) {
    const b = randInt(3, 9);
    const a = b * randInt(4, 12);
    return { prompt: `${a} ÷ ? = ${a / b}`, answer: b };
  }
  if (kind === 1) {
    const a = randInt(5, 14);
    return { prompt: `?² = ${a * a}`, answer: a };
  }
  if (kind === 2) {
    const a = randInt(10, 30);
    const b = randInt(4, 12);
    const c = randInt(2, 7);
    return { prompt: `${a} − ? × ${c} = ${a - b * c}`, answer: b };
  }
  const a = randInt(8, 20);
  const b = randInt(3, 9);
  const c = randInt(2, 6);
  return { prompt: `(${a} − ?) × ${c} = ${(a - b) * c}`, answer: b };
}

export function EquationPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const need = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
  const missLimit = missCap(difficulty);
  const [streak, setStreak] = useState(0);
  const [misses, setMisses] = useState(0);
  const [item, setItem] = useState(() => makeEquation(difficulty));
  const [input, setInput] = useState('');

  const submit = () => {
    const n = Number(input.trim());
    if (!Number.isFinite(n)) return;
    if (n === item.answer) {
      const next = streak + 1;
      if (next >= need) {
        onClear();
        return;
      }
      setStreak(next);
      setItem(makeEquation(difficulty));
      setInput('');
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setStreak(0);
    setInput('');
    setItem(makeEquation(difficulty));
    if (m >= missLimit) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Find ?. {streak}/{need} · Misses {misses}/{missLimit}
      </p>
      <div className="puzzle-prompt" style={{ fontSize: 'clamp(1.4rem, 6vw, 2rem)' }}>
        {item.prompt}
      </div>
      <input
        className="name-input"
        inputMode="numeric"
        value={input}
        placeholder="?"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
      />
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Check
      </button>
    </div>
  );
}

/* ───────────────── Prime hunt ───────────────── */

function isPrime(n: number) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i += 1) if (n % i === 0) return false;
  return true;
}

export function PrimesPuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const count = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 12 : 16;
  const seconds = difficulty === 'easy' ? 25 : difficulty === 'medium' ? 20 : 16;
  const maxN = difficulty === 'hard' ? 70 : 50;
  const missLimit = missCap(difficulty);
  const nums = useMemo(() => {
    const set = new Set<number>();
    const pool = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47];
    const primeNeed = difficulty === 'easy' ? 3 : 4;
    while ([...set].filter(isPrime).length < primeNeed) set.add(pick(pool));
    while (set.size < count) set.add(randInt(2, maxN));
    return shuffle([...set].slice(0, count));
  }, [count, difficulty, maxN]);
  const primes = useMemo(() => new Set(nums.filter(isPrime)), [nums]);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [left, setLeft] = useState(seconds);
  const [misses, setMisses] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLeft((s) => {
        if (done.current) return s;
        if (s <= 1) {
          window.clearInterval(id);
          done.current = true;
          onFail();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [onFail]);

  const tap = (n: number) => {
    if (done.current || found.has(n)) return;
    if (!isPrime(n)) {
      const m = misses + 1;
      setMisses(m);
      if (m >= missLimit) {
        done.current = true;
        onFail();
      }
      return;
    }
    const next = new Set(found);
    next.add(n);
    setFound(next);
    if (next.size >= primes.size) {
      done.current = true;
      onClear();
    }
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Tap every prime. {found.size}/{primes.size} · {left}s · Misses {misses}/{missLimit}
      </p>
      <div className="puzzle-choice-row wrap">
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            className={`btn ${found.has(n) ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => tap(n)}
            disabled={found.has(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────── Safe crack ───────────────── */

export function SafePuzzle({ difficulty, onClear, onFail }: PuzzleProps) {
  const len = difficulty === 'easy' ? 3 : 4;
  const guessesMax = difficulty === 'easy' ? 8 : difficulty === 'medium' ? 7 : 6;
  const secret = useMemo(() => Array.from({ length: len }, () => randInt(0, 9)), [len]);
  const [digits, setDigits] = useState<number[]>([]);
  const [history, setHistory] = useState<{ g: number[]; marks: string[] }[]>([]);

  const push = (d: number) => {
    if (digits.length >= len) return;
    setDigits((x) => [...x, d]);
  };

  const submit = () => {
    if (digits.length < len) return;
    const marks = digits.map((d, i) => {
      if (d === secret[i]) return '=';
      if (d > secret[i]!) return '↓';
      return '↑';
    });
    const next = [...history, { g: digits, marks }];
    setHistory(next);
    setDigits([]);
    if (marks.every((m) => m === '=')) {
      onClear();
      return;
    }
    if (next.length >= guessesMax) onFail();
  };

  return (
    <div className="puzzle-panel">
      <p className="rl-hint">
        Crack the {len}-digit code. = exact · ↑ higher · ↓ lower. Guesses {history.length}/
        {guessesMax}
      </p>
      <div className="mm-history">
        {history.map((h, i) => (
          <div key={i} className="mm-row">
            <span className="puzzle-mono">
              {h.g.join('')} · {h.marks.join(' ')}
            </span>
          </div>
        ))}
      </div>
      <div className="puzzle-prompt puzzle-mono">
        {Array.from({ length: len }, (_, i) => digits[i] ?? '·').join(' ')}
      </div>
      <div className="puzzle-choice-row wrap">
        {Array.from({ length: 10 }, (_, d) => (
          <button key={d} type="button" className="btn btn-secondary" onClick={() => push(d)}>
            {d}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-primary btn-block" onClick={submit}>
        Try code
      </button>
      <button type="button" className="btn btn-secondary btn-block" onClick={() => setDigits([])}>
        Clear
      </button>
    </div>
  );
}
