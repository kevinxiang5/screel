import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useScreel } from '../context/ScreelContext';

const pageTransition = {
  initial: { opacity: 0, x: 28 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const },
};

export function GameChrome({
  title,
  onBack,
  backDisabled = false,
  setup,
  banner,
  dock,
  children,
  className = '',
}: {
  title?: string;
  onBack: () => void;
  backDisabled?: boolean;
  /** Wager + options — keep mounted to avoid layout jumps. */
  setup?: ReactNode;
  banner?: { text: string; kind: 'win' | 'lose' | 'push' } | null;
  dock?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const { remaining } = useScreel();

  return (
    <motion.div
      className={`screen game-stage game-in ${className}`.trim()}
      initial={pageTransition.initial}
      animate={pageTransition.animate}
      exit={pageTransition.exit}
      transition={pageTransition.transition}
    >
      <div className="game-top">
        <button type="button" className="back-btn" onClick={onBack} disabled={backDisabled}>
          <ArrowLeft size={16} /> Play
        </button>
        {title ? <span className="game-title-chip">{title}</span> : <span />}
        <div className="bj-balance">
          <span>Minutes left</span>
          <strong>{remaining}m</strong>
        </div>
      </div>

      {setup ? <div className="game-setup-slot">{setup}</div> : null}

      <div className="game-body">{children}</div>

      <AnimatePresence mode="popLayout">
        {banner ? (
          <motion.div
            key={banner.text}
            className={`result-banner ${banner.kind}`}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            {banner.text}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {dock ? <div className="bj-dock game-dock">{dock}</div> : null}
    </motion.div>
  );
}

export function GameListMotion({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="screen"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={pageTransition.transition}
    >
      {children}
    </motion.div>
  );
}
