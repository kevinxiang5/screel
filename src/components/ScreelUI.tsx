import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

export type ToastTone = 'info' | 'success' | 'warn' | 'error';

interface ToastItem {
  id: string;
  title?: string;
  message: string;
  tone: ToastTone;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'warn' | 'danger' | 'default';
}

interface ScreelUIValue {
  toast: (message: string, opts?: { title?: string; tone?: ToastTone }) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const ScreelUIContext = createContext<ScreelUIValue | null>(null);

const TONE_ICON = {
  info: Info,
  success: CheckCircle2,
  warn: AlertTriangle,
  error: XCircle,
};

export function ScreelUIProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const toast = useCallback((message: string, opts?: { title?: string; tone?: ToastTone }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((t) => [...t, { id, message, title: opts?.title, tone: opts?.tone ?? 'info' }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setConfirmState(opts);
    });
  }, []);

  const closeConfirm = (value: boolean) => {
    setConfirmState(null);
    resolver.current?.(value);
    resolver.current = null;
  };

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);

  return (
    <ScreelUIContext.Provider value={value}>
      {children}

      <div className="screel-toasts" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = TONE_ICON[t.tone];
            return (
              <motion.div
                key={t.id}
                className={`screel-toast ${t.tone}`}
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              >
                <Icon size={18} />
                <div>
                  {t.title && <strong>{t.title}</strong>}
                  <p>{t.message}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmState && (
          <motion.div
            className="screel-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => closeConfirm(false)}
          >
            <motion.div
              className={`screel-modal ${confirmState.tone ?? 'default'}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="screel-modal-title"
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="screel-modal-icon">
                <AlertTriangle size={22} />
              </div>
              <h2 id="screel-modal-title">{confirmState.title}</h2>
              <p>{confirmState.message}</p>
              <div className="screel-modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => closeConfirm(false)}>
                  {confirmState.cancelLabel ?? 'Cancel'}
                </button>
                <button
                  type="button"
                  className={`btn ${confirmState.tone === 'danger' ? 'btn-danger' : 'btn-gold'}`}
                  onClick={() => closeConfirm(true)}
                >
                  {confirmState.confirmLabel ?? 'Continue'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ScreelUIContext.Provider>
  );
}

export function useScreelUI() {
  const ctx = useContext(ScreelUIContext);
  if (!ctx) throw new Error('useScreelUI must be used within ScreelUIProvider');
  return ctx;
}
