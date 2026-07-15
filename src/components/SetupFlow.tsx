import { motion } from 'framer-motion';
import { Link2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useScreel } from '../context/ScreelContext';
import { connectScreenTimeFlow } from '../native/connectScreenTimeFlow';
import {
  ALLOWANCE_MAX,
  ALLOWANCE_MIN,
  ALLOWANCE_PRESETS,
  formatMinutes,
  formatResetClock,
} from '../utils/dayPeriod';
import { useScreelUI } from './ScreelUI';

function toTimeInputValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Shown right after the 18+ check: set budget, reset time, then Connect Screen Time.
 */
export function SetupFlow() {
  const { state, setBaseLimit, setResetTime, connectScreenTime, completeSetup } = useScreel();
  const { toast, confirm } = useScreelUI();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [busy, setBusy] = useState(false);

  const resetLabel = formatResetClock(state.resetHour, state.resetMinute);

  const onResetTimeChange = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) setResetTime(h, m);
  };

  const finish = () => completeSetup();

  const onConnect = async () => {
    if (busy) return;
    const ready = await confirm({
      title: 'Connect Screen Time?',
      message: `Starts a fresh ${formatMinutes(state.minutesBank)} Screel budget (not your Settings total).\n\nPick only apps you want limited.\n\nResets daily at ${resetLabel}.`,
      confirmLabel: 'Connect',
      cancelLabel: 'Not now',
      tone: 'warn',
    });
    if (!ready) return;

    setBusy(true);
    toast('Connecting…', { title: 'Screen Time', tone: 'info' });
    try {
      const result = await connectScreenTimeFlow({
        budgetMinutes: state.minutesBank,
        resetHour: state.resetHour,
        resetMinute: state.resetMinute,
      });
      if (!result.ok) {
        toast(result.message, { title: result.title, tone: result.tone ?? 'warn' });
        return;
      }
      connectScreenTime({ source: result.mode, minutesUsed: 0 });
      toast(
        result.mode === 'screenTime'
          ? `Linked · ${formatMinutes(state.minutesBank)} bank · ${result.applicationCount ?? 0} selection(s).`
          : 'Demo link for now — you can reconnect later from Bank.',
        { title: 'You’re set', tone: 'success' },
      );
      finish();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="age-gate setup-flow">
      <motion.div
        className="age-gate-card setup-card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        key={step}
      >
        <div className="eyebrow">Setup · {step}/3</div>

        {step === 1 && (
          <>
            <h1 className="display lg">Welcome to Screel</h1>
            <p className="lede">
              Your minutes are chips. Play blackjack &amp; roulette with them — and, if you want, limit how long
              chosen apps can eat into the same pile.
            </p>
            <div className="disclosure-box">
              <p>
                Next you’ll pick a daily allowance and a reset time. Then we’ll ask to connect Screen Time —
                the most important step if you want real device limits.
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={() => setStep(2)}>
              <Sparkles size={16} /> Set my minutes
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="display lg">Daily allowance</h1>
            <p className="lede">How many minutes do you want each day before apps can lock?</p>

            <div className="limit-control wager-box setup-stable">
              <label>
                <span>Allowance</span>
                <strong className="tabular">{formatMinutes(state.baseLimit)}</strong>
              </label>
              <input
                type="range"
                min={ALLOWANCE_MIN}
                max={ALLOWANCE_MAX}
                step={15}
                value={state.baseLimit}
                onChange={(e) => setBaseLimit(Number(e.target.value))}
              />
              <div className="preset-row">
                {ALLOWANCE_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn btn-sm ${state.baseLimit === p ? 'btn-gold' : 'btn-secondary'}`}
                    onClick={() => setBaseLimit(p)}
                  >
                    {formatMinutes(p)}
                  </button>
                ))}
              </div>
            </div>

            <div className="limit-control wager-box setup-stable" style={{ marginTop: 14 }}>
              <label>
                <span>Daily reset time</span>
                <strong>{resetLabel}</strong>
              </label>
              <input
                type="time"
                className="time-input"
                value={toTimeInputValue(state.resetHour, state.resetMinute)}
                onChange={(e) => onResetTimeChange(e.target.value)}
              />
              <p className="lede" style={{ marginTop: 8, fontSize: '0.8rem' }}>
                Timezone: {state.timeZone}
              </p>
            </div>

            <div className="bj-actions" style={{ marginTop: 18, gridTemplateColumns: '1fr 1fr' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                Continue
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="display lg">Connect Screen Time</h1>
            <p className="lede">
              This is the core of Screel. Link once, pick the apps that should count, and we’ll start a{' '}
              <strong>fresh {formatMinutes(state.minutesBank)}</strong> budget — not the hours already in
              Settings.
            </p>
            <div className="disclosure-box">
              <p>
                Tip: don’t select every category. Only pick apps you actually want limited. You can skip and
                connect later from Bank.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              style={{ marginTop: 18 }}
              disabled={busy}
              onClick={() => void onConnect()}
            >
              <Link2 size={16} /> {busy ? 'Connecting…' : 'Connect Screen Time'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 10 }}
              disabled={busy}
              onClick={finish}
            >
              Skip for now
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-block"
              style={{ marginTop: 8 }}
              disabled={busy}
              onClick={() => setStep(2)}
            >
              Back
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
