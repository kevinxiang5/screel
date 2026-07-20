import { useEffect } from 'react';
import { motion } from 'framer-motion';

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const done = window.setTimeout(onDone, 1800);
    return () => window.clearTimeout(done);
  }, [onDone]);

  return (
    <motion.div
      className="loading"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <motion.img
        className="loading-logo"
        src={`${import.meta.env.BASE_URL}logo.png`}
        alt="Screel"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        draggable={false}
      />
      <div className="loading-bar" aria-hidden>
        <span />
      </div>
    </motion.div>
  );
}
