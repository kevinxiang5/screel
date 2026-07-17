import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Link2Off, Lock, LockOpen, RefreshCw, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BankPinModal, type BankPinMode } from '../components/BankPinGate';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';
import { connectScreenTimeFlow } from '../native/connectScreenTimeFlow';
import { ScreelScreenTime } from '../native/ScreelScreenTime';
import {
  ALLOWANCE_MAX,
  ALLOWANCE_MIN,
  ALLOWANCE_PRESETS,
  formatMinutes,
  formatResetClock,
} from '../utils/dayPeriod';

function toTimeInputValue(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function BankScreen() {
  const {
    state,
    remaining,
    setBaseLimit,
    setResetTime,
    connectScreenTime,
    disconnectScreenTime,
    claimChallenge,
    resetDay,
    bankLocked,
    bankUnlocked,
    unlockBank,
    lockBankSession,
    setBankPin,
    clearBankPin,
  } = useScreel();
  const { toast, confirm } = useScreelUI();
  const [linking, setLinking] = useState(false);
  const [pinMode, setPinMode] = useState<BankPinMode | null>(null);
  const [pendingPin, setPendingPin] = useState<string | null>(null);
  const isNativeLink = state.usageSource === 'screenTime';
  const settingsEditable = bankUnlocked;

  const resetLabel = useMemo(
    () => formatResetClock(state.resetHour, state.resetMinute),
    [state.resetHour, state.resetMinute],
  );

  const requireUnlock = () => {
    if (settingsEditable) return true;
    setPinMode('unlock');
    return false;
  };

  const onConnect = async () => {
    if (linking) return;

    const ready = await confirm({
      title: 'Link Screen Time?',
      message: `Screel starts a fresh ${formatMinutes(state.minutesBank)} budget from now — it does not import the hours already in Settings → Screen Time.\n\nPick only the apps you want limited (not everything).\n\nDaily reset: ${resetLabel} (${state.timeZone}).`,
      confirmLabel: 'Continue',
      cancelLabel: 'Cancel',
      tone: 'warn',
    });
    if (!ready) return;

    setLinking(true);
    toast('Connecting…', { title: 'Usage link', tone: 'info' });
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
          ? `Fresh ${formatMinutes(state.minutesBank)} bank. Tracking ${result.applicationCount ?? 0} selection(s). Resets at ${resetLabel}.`
          : 'Demo link on — used minutes start at 0 for this session.',
        { title: result.mode === 'screenTime' ? 'Screen Time linked' : 'Usage simulated', tone: 'success' },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not enable Screen Time.';
      toast(message, { title: 'Link failed', tone: 'warn' });
    } finally {
      setLinking(false);
    }
  };

  const onDisconnect = async () => {
    const ok = await confirm({
      title: isNativeLink ? 'Disconnect Screen Time?' : 'Disconnect simulated usage?',
      message: isNativeLink
        ? 'Stops monitoring and unlocks shielded apps. Your minute bank stays.'
        : 'You’ll keep your minute bank.',
      confirmLabel: 'Disconnect',
      cancelLabel: 'Stay linked',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await ScreelScreenTime.stopMonitoring();
    } catch {
      /* web / unused */
    }
    disconnectScreenTime();
    toast(isNativeLink ? 'Screen Time unlocked & disconnected.' : 'Simulated link removed.', {
      title: 'Disconnected',
      tone: 'info',
    });
  };

  const onReset = async () => {
    if (!requireUnlock()) return;
    const ok = await confirm({
      title: 'Reset this period?',
      message: `Restores bank to ${formatMinutes(state.baseLimit)}, clears used minutes, unlocks apps. Next auto-reset is still ${resetLabel}.`,
      confirmLabel: 'Reset now',
      cancelLabel: 'Keep going',
      tone: 'warn',
    });
    if (!ok) return;
    resetDay();
    if (isNativeLink) {
      try {
        await ScreelScreenTime.resetUsageDay();
        await ScreelScreenTime.startMonitoring({
          budgetMinutes: state.baseLimit,
          resetUsed: true,
          resetHour: state.resetHour,
          resetMinute: state.resetMinute,
        });
      } catch {
        /* ignore */
      }
    }
    toast(`Bank restored to ${formatMinutes(state.baseLimit)}.`, {
      title: 'Period reset',
      tone: 'success',
    });
  };

  const onClaim = (id: string, reward: number, title: string) => {
    claimChallenge(id);
    toast(`+${reward}m dropped into your bank.`, { title: `${title} claimed`, tone: 'success' });
  };

  const onResetTimeChange = (value: string) => {
    if (!requireUnlock()) return;
    const [h, m] = value.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) setResetTime(h, m);
  };

  const onAllowanceChange = (n: number) => {
    if (!requireUnlock()) return;
    setBaseLimit(n);
  };

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Allowance</div>
        <h1 className="display lg">Your bank</h1>
        <p className="lede">
          Daily minutes for the apps you choose to limit. Earn a little more from minigames — losses never
          take from this pile. Fresh Screel budget, not your Settings Screen Time total.
        </p>
      </motion.div>

      <section className="section" style={{ marginTop: 14 }}>
        <div className="connect-card connect-card-priority">
          <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
            <Shield size={22} color="var(--lime)" />
            <div>
              <h3 className="display md" style={{ fontSize: '1.1rem' }}>
                {isNativeLink ? 'Screen Time linked' : 'Connect Screen Time'}
              </h3>
              <p className="lede" style={{ marginTop: 6 }}>
                {state.connected
                  ? isNativeLink
                    ? `Budget ${formatMinutes(state.minutesBank)} · resets ${resetLabel}`
                    : 'Demo sync — reconnect anytime for real limits.'
                  : 'Most important step: authorize, pick apps, start your fresh bank.'}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
            {state.connected ? (
              <button type="button" className="btn btn-secondary btn-block" onClick={() => void onDisconnect()}>
                <Link2Off size={16} /> Disconnect & unlock
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => void onConnect()}
                disabled={linking}
              >
                <Link2 size={16} /> {linking ? 'Connecting…' : 'Connect Screen Time'}
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="hero-panel bank-hero-stable" style={{ marginTop: 18 }}>
        <div className="bank-row">
          <div>
            <div className="bank-value tabular">{formatMinutes(state.minutesBank)}</div>
            <span className="bank-unit">in bank</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="display md tabular" style={{ color: 'var(--lime)' }}>
              {formatMinutes(remaining)}
            </div>
            <span className="bank-unit">still free</span>
          </div>
        </div>
        <div className="bank-meta">
          <p>
            Used this period: <strong className="tabular">{formatMinutes(state.minutesUsed)}</strong>
            {state.connected ? (isNativeLink ? ' · selected apps' : ' · simulated') : ' · not linked yet'}
          </p>
          <p>
            Auto-resets daily at <strong>{resetLabel}</strong> · {state.timeZone}
          </p>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Bank lock</h2>
          <span className={`pill ${bankLocked ? 'gold' : ''}`}>{bankLocked ? 'On' : 'Off'}</span>
        </div>
        <div className="panel-box bank-lock-box">
          <p className="lede" style={{ margin: 0 }}>
            Optional 4-digit PIN. Locks daily allowance, reset time, and “reset this period” so nobody can
            bump the bank mid-day.
          </p>
          <div className="bank-lock-actions">
            {!bankLocked ? (
              <button type="button" className="btn btn-secondary btn-block" onClick={() => setPinMode('set')}>
                <Lock size={16} /> Set PIN
              </button>
            ) : settingsEditable ? (
              <>
                <button type="button" className="btn btn-secondary btn-block" onClick={lockBankSession}>
                  <Lock size={16} /> Lock settings again
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-block"
                  onClick={() => setPinMode('remove')}
                >
                  Remove PIN
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-gold btn-block" onClick={() => setPinMode('unlock')}>
                <LockOpen size={16} /> Unlock settings
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={`section ${!settingsEditable ? 'bank-settings-locked' : ''}`}>
        <div className="section-head">
          <h2>Daily allowance</h2>
          <span className="pill gold tabular">{formatMinutes(state.baseLimit)}</span>
        </div>
        {!settingsEditable && (
          <button type="button" className="bank-lock-banner" onClick={() => setPinMode('unlock')}>
            <Lock size={14} /> Unlock to edit allowance
          </button>
        )}
        <div className="limit-control panel-box allowance-stable">
          <label>
            <span>How much Screen Time you want</span>
            <strong className="tabular allowance-readout">{formatMinutes(state.baseLimit)}</strong>
          </label>
          <input
            type="range"
            min={ALLOWANCE_MIN}
            max={ALLOWANCE_MAX}
            step={15}
            value={state.baseLimit}
            disabled={!settingsEditable}
            onChange={(e) => onAllowanceChange(Number(e.target.value))}
          />
          <div className="preset-row">
            {ALLOWANCE_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                className={`btn btn-sm ${state.baseLimit === p ? 'btn-gold' : 'btn-secondary'}`}
                disabled={!settingsEditable}
                onClick={() => onAllowanceChange(p)}
              >
                {formatMinutes(p)}
              </button>
            ))}
          </div>
          <p className="lede allowance-hint">
            30 minutes to 16 hours. Challenge wins can add minutes (daily cap).
          </p>
        </div>
      </section>

      <section className={`section ${!settingsEditable ? 'bank-settings-locked' : ''}`}>
        <div className="section-head">
          <h2>Daily reset time</h2>
        </div>
        {!settingsEditable && (
          <button type="button" className="bank-lock-banner" onClick={() => setPinMode('unlock')}>
            <Lock size={14} /> Unlock to edit reset time
          </button>
        )}
        <div className="panel-box reset-time-box">
          <div className="reset-time-head">
            <span>When your allowance restarts</span>
            <strong className="tabular">{resetLabel}</strong>
          </div>
          <div className="reset-time-field">
            <input
              type="time"
              className="time-input"
              value={toTimeInputValue(state.resetHour, state.resetMinute)}
              disabled={!settingsEditable}
              onChange={(e) => onResetTimeChange(e.target.value)}
            />
          </div>
          <p className="lede reset-time-hint">
            Uses this phone’s timezone. At that time Screel restores your ceiling and unlocks apps.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          style={{ marginTop: 12 }}
          onClick={() => void onReset()}
        >
          <RefreshCw size={16} /> Reset this period now
        </button>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Claim rewards</h2>
        </div>
        {state.challenges.map((c) => {
          const ready = c.progress >= c.target && !c.claimed;
          return (
            <div className="challenge" key={c.id}>
              <div className="challenge-top">
                <div>
                  <h3>{c.title}</h3>
                  <p>
                    {c.progress}/{c.target} · +{c.reward}m
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-gold"
                  disabled={!ready}
                  onClick={() => onClaim(c.id, c.reward, c.title)}
                >
                  {c.claimed ? 'Claimed' : 'Claim'}
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <AnimatePresence>
        {pinMode && (
          <BankPinModal
            mode={pinMode}
            pendingPin={pendingPin}
            onCancel={() => {
              setPinMode(null);
              setPendingPin(null);
            }}
            onUnlock={async (pin) => {
              const ok = await unlockBank(pin);
              if (ok) {
                toast('Bank settings unlocked for this session.', { title: 'Unlocked', tone: 'success' });
                setPinMode(null);
              }
              return ok;
            }}
            onSet={(pin) => {
              setPendingPin(pin);
              setPinMode('confirm');
            }}
            onConfirm={async (pin) => {
              const ok = await setBankPin(pin);
              if (ok) {
                toast('Allowance and reset time now need this PIN.', { title: 'PIN set', tone: 'success' });
                setPendingPin(null);
                setPinMode(null);
              }
              return ok;
            }}
            onRemove={async (pin) => {
              const ok = await clearBankPin(pin);
              if (ok) {
                toast('Bank lock turned off.', { title: 'PIN removed', tone: 'info' });
                setPinMode(null);
              }
              return ok;
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
