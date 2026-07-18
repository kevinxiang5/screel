import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { BellOff, Clock, Gamepad2, Link2, MessageCircle, Moon, Play, Radio, ShieldCheck, Sparkles, Target, Timer, Tv } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

type StepId = 'welcome' | 'name' | 'goal' | 'apps' | 'estimate' | 'budget' | 'connect';

const STEPS: StepId[] = ['welcome', 'name', 'goal', 'apps', 'estimate', 'budget', 'connect'];

const GOALS = [
  { id: 'scroll', label: 'Stop endless scrolling', icon: BellOff },
  { id: 'sleep', label: 'Sleep earlier', icon: Moon },
  { id: 'focus', label: 'Focus on work or school', icon: Target },
  { id: 'present', label: 'Be more present', icon: Sparkles },
] as const;

const DISTRACTIONS = [
  { id: 'social', label: 'Social feeds', icon: Radio },
  { id: 'video', label: 'Short videos', icon: Play },
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'messaging', label: 'Messaging', icon: MessageCircle },
  { id: 'streaming', label: 'Streaming', icon: Tv },
  { id: 'browsing', label: 'Browsing', icon: Clock },
] as const;

const chipList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const chipItem: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 24 } },
};

function toTimeInputValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Animated count-up number for the savings projection. */
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const dur = 900;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [to]);

  return (
    <span className="count-num">
      {value}
      {suffix}
    </span>
  );
}

/**
 * Personalized onboarding: name, goal, distractions, estimate, budget, connect.
 */
export function SetupFlow() {
  const { state, setBaseLimit, setResetTime, connectScreenTime, completeSetup, updateProfile } =
    useScreel();
  const { toast, confirm } = useScreelUI();
  const [stepIdx, setStepIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(state.displayName === 'Focus Mode' ? '' : state.displayName);
  const [goal, setGoal] = useState<string | null>(state.focusGoal);
  const [apps, setApps] = useState<string[]>(state.distractions);
  const [hoursADay, setHoursADay] = useState(4);

  const step = STEPS[stepIdx];
  const firstName = (name.trim() || 'friend').split(' ')[0];
  const resetLabel = formatResetClock(state.resetHour, state.resetMinute);

  const go = (delta: 1 | -1) => {
    setDir(delta);
    setStepIdx((i) => Math.max(0, Math.min(STEPS.length - 1, i + delta)));
  };

  const next = () => go(1);
  const back = () => go(-1);

  const saveNameAndNext = () => {
    updateProfile({ displayName: name.trim() || 'Focus Mode' });
    next();
  };

  const saveGoalAndNext = () => {
    updateProfile({ focusGoal: goal });
    next();
  };

  const saveAppsAndNext = () => {
    updateProfile({ distractions: apps });
    next();
  };

  // Suggest ~60% of their current usage, snapped to the slider step.
  const suggestedBudget = Math.max(
    ALLOWANCE_MIN,
    Math.min(ALLOWANCE_MAX, Math.round((hoursADay * 60 * 0.6) / 15) * 15),
  );

  const suggestBudgetAndNext = () => {
    setBaseLimit(suggestedBudget);
    next();
  };

  const toggleApp = (id: string) => {
    setApps((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const onResetTimeChange = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) setResetTime(h, m);
  };

  const savedPerMonth = Math.max(0, Math.round(((hoursADay * 60 - suggestedBudget) * 30) / 60));
  const monthlyHours = Math.round(hoursADay * 30);

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
        { title: `You’re set, ${firstName}`, tone: 'success' },
      );
      completeSetup();
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
      >
        <div className="setup-progress">
          <motion.div
            className="setup-progress-fill"
            animate={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 160, damping: 24 }}
          />
        </div>

        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step}
            custom={dir}
            initial={{ opacity: 0, x: 44 * dir }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -44 * dir }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {step === 'welcome' && (
              <>
                <motion.div
                  className="setup-mark"
                  initial={{ scale: 0.5, rotate: -14 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 240, damping: 15, delay: 0.05 }}
                >
                  S
                </motion.div>
                <h1 className="display lg">Let’s take your time back</h1>
                <p className="lede">A couple of quick questions so Screel fits how you actually use your phone.</p>
                <motion.div className="feature-list" variants={chipList} initial="hidden" animate="show">
                  {[
                    { icon: Timer, text: 'Set a daily minute budget for chosen apps' },
                    { icon: ShieldCheck, text: 'Apps can lock when the budget runs out' },
                    { icon: Sparkles, text: 'Stake minutes on challenges to win more' },
                  ].map(({ icon: Icon, text }) => (
                    <motion.div className="feature-row" key={text} variants={chipItem}>
                      <span className="feature-icon">
                        <Icon size={17} />
                      </span>
                      <span>{text}</span>
                    </motion.div>
                  ))}
                </motion.div>
                <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 18 }} onClick={next}>
                  Get started
                </button>
              </>
            )}

            {step === 'name' && (
              <>
                <h1 className="display lg">What should we call you?</h1>
                <p className="lede">Just a first name is perfect. It stays on this device.</p>
                <motion.input
                  className="name-input setup-name"
                  placeholder="Your name"
                  value={name}
                  maxLength={20}
                  autoFocus
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveNameAndNext()}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                />
                <div className="bj-actions" style={{ marginTop: 18, gridTemplateColumns: '1fr 2fr' }}>
                  <button type="button" className="btn btn-secondary" onClick={back}>
                    Back
                  </button>
                  <button type="button" className="btn btn-primary" onClick={saveNameAndNext}>
                    {name.trim() ? `Continue as ${firstName}` : 'Skip'}
                  </button>
                </div>
              </>
            )}

            {step === 'goal' && (
              <>
                <h1 className="display lg">Why are you here, {firstName}?</h1>
                <p className="lede">We’ll shape Screel around what matters to you.</p>
                <motion.div className="chip-grid" variants={chipList} initial="hidden" animate="show">
                  {GOALS.map(({ id, label, icon: Icon }) => (
                    <motion.button
                      key={id}
                      type="button"
                      className={`chip ${goal === id ? 'selected' : ''}`}
                      variants={chipItem}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setGoal(id)}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </motion.button>
                  ))}
                </motion.div>
                <div className="bj-actions" style={{ marginTop: 18, gridTemplateColumns: '1fr 2fr' }}>
                  <button type="button" className="btn btn-secondary" onClick={back}>
                    Back
                  </button>
                  <button type="button" className="btn btn-primary" onClick={saveGoalAndNext} disabled={!goal}>
                    Continue
                  </button>
                </div>
              </>
            )}

            {step === 'apps' && (
              <>
                <h1 className="display lg">What eats your time?</h1>
                <p className="lede">Pick everything that applies — you’ll choose the exact apps later.</p>
                <motion.div className="chip-grid" variants={chipList} initial="hidden" animate="show">
                  {DISTRACTIONS.map(({ id, label, icon: Icon }) => (
                    <motion.button
                      key={id}
                      type="button"
                      className={`chip ${apps.includes(id) ? 'selected' : ''}`}
                      variants={chipItem}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => toggleApp(id)}
                    >
                      <Icon size={18} />
                      <span>{label}</span>
                    </motion.button>
                  ))}
                </motion.div>
                <div className="bj-actions" style={{ marginTop: 18, gridTemplateColumns: '1fr 2fr' }}>
                  <button type="button" className="btn btn-secondary" onClick={back}>
                    Back
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={saveAppsAndNext}
                    disabled={apps.length === 0}
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {step === 'estimate' && (
              <>
                <h1 className="display lg">How much time do they take?</h1>
                <p className="lede">Rough guess for an average day — be honest, {firstName}.</p>

                <div className="limit-control panel-box setup-stable" style={{ marginTop: 14 }}>
                  <label>
                    <span>On those apps</span>
                    <strong className="tabular">{hoursADay}h / day</strong>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    step={1}
                    value={hoursADay}
                    onChange={(e) => setHoursADay(Number(e.target.value))}
                  />
                </div>

                <motion.div
                  className="savings-card"
                  key={hoursADay}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <p>
                    That’s about <CountUp to={monthlyHours} suffix="h" /> a month.
                  </p>
                  <p className="savings-line">
                    A tighter budget could hand you back <CountUp to={savedPerMonth} suffix="h" /> every
                    month.
                  </p>
                </motion.div>

                <div className="bj-actions" style={{ marginTop: 18, gridTemplateColumns: '1fr 2fr' }}>
                  <button type="button" className="btn btn-secondary" onClick={back}>
                    Back
                  </button>
                  <button type="button" className="btn btn-primary" onClick={suggestBudgetAndNext}>
                    Build my budget
                  </button>
                </div>
              </>
            )}

            {step === 'budget' && (
              <>
                <h1 className="display lg">Your daily budget</h1>
                <p className="lede">
                  We suggest <strong>{formatMinutes(state.baseLimit)}</strong> based on your answers. Tune it
                  however you like.
                </p>

                <div className="limit-control panel-box setup-stable">
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

                <div className="panel-box reset-time-box setup-stable" style={{ marginTop: 14 }}>
                  <div className="reset-time-head">
                    <span>Daily reset time</span>
                    <strong className="tabular">{resetLabel}</strong>
                  </div>
                  <div className="reset-time-field">
                    <input
                      type="time"
                      className="time-input"
                      value={toTimeInputValue(state.resetHour, state.resetMinute)}
                      onChange={(e) => onResetTimeChange(e.target.value)}
                    />
                  </div>
                  <p className="lede reset-time-hint">Timezone: {state.timeZone}</p>
                </div>

                <div className="bj-actions" style={{ marginTop: 18, gridTemplateColumns: '1fr 2fr' }}>
                  <button type="button" className="btn btn-secondary" onClick={back}>
                    Back
                  </button>
                  <button type="button" className="btn btn-primary" onClick={next}>
                    Continue
                  </button>
                </div>
              </>
            )}

            {step === 'connect' && (
              <>
                <h1 className="display lg">Last step, {firstName}</h1>
                <p className="lede">
                  Link Apple Screen Time so limits actually stick. We’ll start a{' '}
                  <strong>fresh {formatMinutes(state.minutesBank)}</strong> budget — not the hours already in
                  Settings.
                </p>
                <div className="disclosure-box">
                  <p>
                    Tip: don’t select every category. Only pick apps you actually want limited. You can skip
                    and connect later from Bank.
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
                  onClick={completeSetup}
                >
                  Skip for now
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  style={{ marginTop: 8 }}
                  disabled={busy}
                  onClick={back}
                >
                  Back
                </button>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
