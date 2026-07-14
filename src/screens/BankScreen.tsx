import { motion } from 'framer-motion';
import { Link2, Link2Off, RefreshCw, Shield } from 'lucide-react';
import { useState } from 'react';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';
import { ScreelScreenTime } from '../native/ScreelScreenTime';

export function BankScreen() {
  const { state, remaining, setBaseLimit, connectScreenTime, disconnectScreenTime, claimChallenge, resetDay } =
    useScreel();
  const { toast, confirm } = useScreelUI();
  const [linking, setLinking] = useState(false);
  const isNativeLink = state.usageSource === 'screenTime';

  const onConnect = async () => {
    if (linking) return;
    setLinking(true);
    toast('Connecting…', { title: 'Usage link', tone: 'info' });
    try {
      const native = await ScreelScreenTime.isNativeAvailable();
      if (!native.available) {
        connectScreenTime({ source: 'simulated' });
        toast(
          native.reason === 'simulator'
            ? 'Simulator cannot use Family Controls. Linked as a local demo — use a physical iPhone for real Screen Time.'
            : native.reason === 'timeout'
              ? 'Native Screen Time plugin did not respond. Linked as a local demo for now — rebuild iOS after pulling latest.'
              : 'Simulated usage linked. Real Screen Time needs the native iOS build on a physical device.',
          { title: 'Usage simulated', tone: 'success' },
        );
        return;
      }

      const auth = await ScreelScreenTime.requestAuthorization();
      if (auth.status !== 'approved') {
        toast(auth.error ?? 'Screen Time authorization was not granted.', {
          title: 'Permission needed',
          tone: 'warn',
        });
        return;
      }

      const pick = await ScreelScreenTime.presentAppPicker();
      if (!pick.selected) {
        toast('Pick at least one app or category to track.', { title: 'Nothing selected', tone: 'warn' });
        return;
      }

      const started = await ScreelScreenTime.startMonitoring({ budgetMinutes: state.minutesBank });
      if (!started.ok) {
        toast('Could not start Device Activity monitoring. Check Family Controls entitlements in Xcode.', {
          title: 'Monitoring failed',
          tone: 'warn',
        });
        return;
      }
      const usage = await ScreelScreenTime.getTodayUsageMinutes();
      connectScreenTime({ source: 'screenTime', minutesUsed: usage.minutes });
      toast(`Tracking ${pick.applicationCount} selection(s) via system Screen Time APIs.`, {
        title: 'Screen Time linked',
        tone: 'success',
      });
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
        ? 'Stops Device Activity monitoring and clears OS shields for the apps you selected. Your minute bank stays.'
        : 'You’ll keep your minute bank. This demo link does not control system Screen Time.',
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
    toast(isNativeLink ? 'Screen Time link removed.' : 'Simulated usage link removed.', {
      title: 'Disconnected',
      tone: 'info',
    });
  };

  const onReset = async () => {
    const ok = await confirm({
      title: 'Reset the day?',
      message: `Restores your bank to the ${state.baseLimit}m ceiling, clears used minutes, and refreshes daily challenges. Streak stays.`,
      confirmLabel: 'Reset day',
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
        });
      } catch {
        /* ignore */
      }
    }
    toast(`Bank restored to ${state.baseLimit}m. Streak continues.`, {
      title: 'New day dealt',
      tone: 'success',
    });
  };

  const onClaim = (id: string, reward: number, title: string) => {
    claimChallenge(id);
    toast(`+${reward}m dropped into your bank.`, { title: `${title} claimed`, tone: 'success' });
  };

  return (
    <div className="screen">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow">Minute vault</div>
        <h1 className="display lg">Your bank</h1>
        <p className="lede">
          Set a daily ceiling and claim challenges. Minutes are fictional chips for play — no cash value.
        </p>
      </motion.div>

      <div className="disclosure-box" style={{ marginTop: 14 }}>
        <p>
          {isNativeLink ? (
            <>
              <strong>Apple Screen Time linked.</strong> Screel monitors apps you pick via Family Controls and
              can shield them when your minute bank hits zero. It does not edit the Settings app UI.
            </>
          ) : (
            <>
              <strong>Usage link.</strong> On a physical iPhone with Family Controls enabled, Connect asks for
              Screen Time permission, lets you pick apps, and starts system monitoring. Web / Simulator stay
              simulated.
            </>
          )}
        </p>
      </div>

      <div className="hero-panel" style={{ marginTop: 18 }}>
        <div className="bank-row">
          <div>
            <div className="bank-value">{state.minutesBank}</div>
            <span className="bank-unit">minutes in bank</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="display md" style={{ color: 'var(--lime)' }}>
              {remaining}
            </div>
            <span className="bank-unit">still free</span>
          </div>
        </div>
        {state.connected && (
          <p className="lede" style={{ marginTop: 12, fontSize: '0.82rem' }}>
            Used today: {state.minutesUsed}m
            {isNativeLink ? ' · from selected apps' : ' · simulated'}
          </p>
        )}
      </div>

      <section className="section">
        <div className="connect-card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
            <Shield size={22} color="var(--lime)" />
            <div>
              <h3 className="display md" style={{ fontSize: '1.1rem' }}>
                {isNativeLink ? 'Screen Time link' : 'Usage link'}
              </h3>
              <p className="lede" style={{ marginTop: 6 }}>
                {state.connected
                  ? isNativeLink
                    ? 'System APIs are tracking your selected apps against today’s bank.'
                    : 'Demo sync is on — used minutes are simulated locally.'
                  : 'Connect to authorize Screen Time, pick apps, and start monitoring (iPhone).'}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
            {state.connected ? (
              <button type="button" className="btn btn-secondary btn-block" onClick={onDisconnect}>
                <Link2Off size={16} /> Disconnect
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

      <section className="section">
        <div className="section-head">
          <h2>Daily ceiling</h2>
          <span className="pill gold">{state.baseLimit}m</span>
        </div>
        <div className="limit-control wager-box">
          <label>
            <span>Base allowance</span>
            <strong>{state.baseLimit} min</strong>
          </label>
          <input
            type="range"
            min={15}
            max={240}
            step={5}
            value={state.baseLimit}
            onChange={(e) => setBaseLimit(Number(e.target.value))}
          />
          <p className="lede" style={{ marginTop: 10, fontSize: '0.82rem' }}>
            Wins push the bank above this. Losses carve it down. Reset Day restores the ceiling.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 12 }} onClick={onReset}>
          <RefreshCw size={16} /> Reset day · keep streak
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
    </div>
  );
}
