import { useEffect, type CSSProperties } from 'react';
import { motion } from 'framer-motion';

const DOTS = [
  { size: 10, dist: 88, dur: 3.2, delay: 0, opacity: 0.95, start: 0 },
  { size: 7, dist: 102, dur: 4.1, delay: 0.12, opacity: 0.8, start: 45 },
  { size: 14, dist: 78, dur: 2.6, delay: 0.05, opacity: 1, start: 90 },
  { size: 5, dist: 114, dur: 5.0, delay: 0.22, opacity: 0.65, start: 135 },
  { size: 9, dist: 94, dur: 3.6, delay: 0.18, opacity: 0.85, start: 180 },
  { size: 6, dist: 108, dur: 4.6, delay: 0.08, opacity: 0.7, start: 225 },
  { size: 12, dist: 84, dur: 2.9, delay: 0.28, opacity: 0.9, start: 270 },
  { size: 4, dist: 120, dur: 5.4, delay: 0.15, opacity: 0.55, start: 315 },
] as const;

export function LoadingScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const done = window.setTimeout(onDone, 2200);
    return () => window.clearTimeout(done);
  }, [onDone]);

  return (
    <motion.div
      className="loading"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      <div className="loading-stage" role="status" aria-live="polite" aria-label="Loading Screel">
        <div className="loading-orbit" aria-hidden>
          {DOTS.map((dot, i) => (
            <span
              key={i}
              className="loading-float-rotor"
              style={
                {
                  '--dot-dur': `${dot.dur}s`,
                  '--dot-delay': `${0.2 + dot.delay}s`,
                } as CSSProperties
              }
            >
              <span
                className="loading-float-arm"
                style={{ '--arm-angle': `${dot.start}deg` } as CSSProperties}
              >
                <span
                  className="loading-float-dot"
                  style={
                    {
                      '--dot-size': `${dot.size}px`,
                      '--dot-dist': `${dot.dist}px`,
                      '--dot-opacity': dot.opacity,
                      '--dot-delay': `${0.2 + dot.delay}s`,
                    } as CSSProperties
                  }
                />
              </span>
            </span>
          ))}
        </div>

        <motion.img
          className="loading-logo"
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="Screel"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          draggable={false}
        />
      </div>
    </motion.div>
  );
}
