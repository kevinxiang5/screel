import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Delete, Lock, LockOpen } from 'lucide-react';

export type BankPinMode = 'unlock' | 'set' | 'confirm' | 'remove';

const COPY: Record<BankPinMode, { title: string; message: string }> = {
  unlock: {
    title: 'Unlock bank settings',
    message: 'Enter your 4-digit PIN to change allowance, reset time, or reset this period.',
  },
  set: {
    title: 'Create bank PIN',
    message: 'Optional lock. Pick a 4-digit PIN so allowance can’t be bumped mid-day.',
  },
  confirm: {
    title: 'Confirm PIN',
    message: 'Enter the same 4 digits once more.',
  },
  remove: {
    title: 'Remove bank PIN',
    message: 'Enter your current PIN to turn the lock off.',
  },
};

export function BankPinModal({
  mode,
  pendingPin,
  onCancel,
  onUnlock,
  onSet,
  onConfirm,
  onRemove,
}: {
  mode: BankPinMode;
  pendingPin?: string | null;
  onCancel: () => void;
  onUnlock: (pin: string) => Promise<boolean>;
  onSet: (pin: string) => void;
  onConfirm: (pin: string) => Promise<boolean>;
  onRemove: (pin: string) => Promise<boolean>;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const copy = COPY[mode];

  useEffect(() => {
    setPin('');
    setError(null);
  }, [mode]);

  const finish = async (value: string) => {
    setBusy(true);
    try {
      if (mode === 'set') {
        onSet(value);
        return;
      }
      if (mode === 'confirm') {
        if (!pendingPin || value !== pendingPin) {
          setError('PINs didn’t match. Try again.');
          setPin('');
          return;
        }
        const ok = await onConfirm(value);
        if (!ok) {
          setError('Could not save PIN.');
          setPin('');
        }
        return;
      }
      if (mode === 'remove') {
        const ok = await onRemove(value);
        if (!ok) {
          setError('Wrong PIN.');
          setPin('');
        }
        return;
      }
      const ok = await onUnlock(value);
      if (!ok) {
        setError('Wrong PIN.');
        setPin('');
      }
    } finally {
      setBusy(false);
    }
  };

  const press = (digit: string) => {
    if (busy || pin.length >= 4) return;
    const next = pin + digit;
    setPin(next);
    setError(null);
    if (next.length === 4) void finish(next);
  };

  return (
    <motion.div
      className="bank-pin-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bank-pin-sheet"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
      >
        <div className="bank-pin-icon">{mode === 'set' || mode === 'confirm' ? <LockOpen size={22} /> : <Lock size={22} />}</div>
        <h2>{copy.title}</h2>
        <p>{copy.message}</p>
        <div className="bank-pin-dots" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i < pin.length ? 'filled' : ''} />
          ))}
        </div>
        {error && <div className="bank-pin-error">{error}</div>}
        <div className="bank-pin-pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((key) => {
            if (key === '') return <span key="blank" />;
            if (key === 'del') {
              return (
                <button
                  key="del"
                  type="button"
                  className="bank-pin-key muted"
                  onClick={() => {
                    if (!busy) {
                      setPin((p) => p.slice(0, -1));
                      setError(null);
                    }
                  }}
                  disabled={busy}
                >
                  <Delete size={18} />
                </button>
              );
            }
            return (
              <button key={key} type="button" className="bank-pin-key" onClick={() => press(key)} disabled={busy}>
                {key}
              </button>
            );
          })}
        </div>
        <button type="button" className="btn btn-secondary btn-block" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
      </motion.div>
    </motion.div>
  );
}
