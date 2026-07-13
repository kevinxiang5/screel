import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const STATUS = [
  'Shuffling the shoe…',
  'Seeding the felt…',
  'Counting your minutes…',
  'Warming the wheel…',
];

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [statusIdx, setStatusIdx] = useState(0);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUS.length);
    }, 450);
    const done = window.setTimeout(onDone, 2000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(done);
    };
  }, [onDone]);

  return (
    <motion.div
      className="loading"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.45 }}
    >
      <div className="loading-orbit" />
      <div className="loading-card">
        <motion.div
          className="loading-mark"
          initial={{ scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 16 }}
        >
          S
        </motion.div>
        <motion.h1
          className="loading-brand"
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          screel
        </motion.h1>
        <p className="loading-sub">Play with your minutes</p>
        <div className="loading-bar">
          <span />
        </div>
        <p className="loading-status">{STATUS[statusIdx]}</p>
      </div>
    </motion.div>
  );
}
