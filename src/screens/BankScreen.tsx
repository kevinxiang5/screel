import { motion } from 'framer-motion';
import { Link2, Link2Off, RefreshCw, Shield } from 'lucide-react';
import { useScreelUI } from '../components/ScreelUI';
import { useScreel } from '../context/ScreelContext';

import { ScreelScreenTime } from '../native/ScreelScreenTime';

export function BankScreen() {
  const { state, remaining, setBaseLimit, connectScreenTime, disconnectScreenTime, claimChallenge, resetDay } =
    useScreel();
  const { toast, confirm } = useScreelUI();

  const onConnect = async () => {
    const native = await ScreelScreenTime.isNativeAvailable();
    if (native.available) {
      const auth = await ScreelScreenTime.requestAuthorization();
      if (auth.status !== 'approved') {
        toast('Screen Time authorization was not granted.', { title: 'Permission needed', tone: 'warn' });
        return;
      }
      const usage = await ScreelScreenTime.getTodayUsageMinutes();
      connectScreenTime();
      toast(`Linked via system APIs · ~${usage.minutes}m tracked today.`, {
        title: 'Usage linked',
        tone: 'success',
      });
      return;
    }
    connectScreenTime();
    toast('Simulated usage linked for this device session. Not Apple Screen Time yet.', {
      title: 'Usage simulated',
      tone: 'success',
    });
  };

  const onDisconnect = async () => {
    const ok = await confirm({
      title: 'Disconnect simulated usage?',
      message: 'You’ll keep your minute bank. This demo link does not control system Screen Time.',
      confirmLabel: 'Disconnect',
      cancelLabel: 'Stay linked',
      tone: 'danger',
    });
    if (!ok) return;
    disconnectScreenTime();
    toast('Simulated usage link removed.', { title: 'Disconnected', tone: 'info' });
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
          Set a daily ceiling and claim challenges. Minutes are fictional chips — no cash value.
        </p>
      </motion.div>

      <div className="disclosure-box" style={{ marginTop: 14 }}>
        <p>
          <strong>Demo usage link.</strong> Connect simulates minutes used on-device. Real Apple Screen Time /
          Family Controls blocking ships only after native iOS entitlement approval — this build does not
          modify system Settings.
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
      </div>

      <section className="section">
        <div className="connect-card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
            <Shield size={22} color="var(--lime)" />
            <div>
              <h3 className="display md" style={{ fontSize: '1.1rem' }}>
                Usage link (simulated)
              </h3>
              <p className="lede" style={{ marginTop: 6 }}>
                {state.connected
                  ? 'Demo sync is on — used minutes are simulated locally so the bank stays honest in-app.'
                  : 'Connect to simulate today’s usage against your ceiling. Not a live Screen Time API call.'}
              </p>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
            {state.connected ? (
              <button type="button" className="btn btn-secondary btn-block" onClick={onDisconnect}>
                <Link2Off size={16} /> Disconnect simulation
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-block" onClick={onConnect}>
                <Link2 size={16} /> Simulate usage link
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
