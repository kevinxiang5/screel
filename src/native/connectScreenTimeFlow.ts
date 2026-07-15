import { ScreelScreenTime } from './ScreelScreenTime';

export type ConnectFlowResult =
  | { ok: true; mode: 'screenTime' | 'simulated'; applicationCount?: number }
  | { ok: false; title: string; message: string; tone?: 'warn' | 'info' };

/** Shared Connect Screen Time path for onboarding + Bank. Always starts used at 0. */
export async function connectScreenTimeFlow(options: {
  budgetMinutes: number;
  resetHour: number;
  resetMinute: number;
}): Promise<ConnectFlowResult> {
  const native = await ScreelScreenTime.isNativeAvailable();
  if (!native.available) {
    return { ok: true, mode: 'simulated' };
  }

  const auth = await ScreelScreenTime.requestAuthorization();
  if (auth.status !== 'approved') {
    return {
      ok: false,
      title: 'Permission needed',
      message: auth.error ?? 'Screen Time authorization was not granted.',
      tone: 'warn',
    };
  }

  const pick = await ScreelScreenTime.presentAppPicker();
  if (!pick.selected) {
    return {
      ok: false,
      title: 'Nothing selected',
      message: 'Pick only the apps you want Screel to limit — avoid selecting everything.',
      tone: 'warn',
    };
  }

  await ScreelScreenTime.resetUsageDay();
  await ScreelScreenTime.applyShieldWhenBroke({ broke: false });
  const started = await ScreelScreenTime.startMonitoring({
    budgetMinutes: Math.max(1, options.budgetMinutes),
    resetUsed: true,
    resetHour: options.resetHour,
    resetMinute: options.resetMinute,
  });
  if (!started.ok) {
    return {
      ok: false,
      title: 'Monitoring failed',
      message: 'Could not start monitoring. Check Family Controls entitlements in Xcode.',
      tone: 'warn',
    };
  }

  return { ok: true, mode: 'screenTime', applicationCount: pick.applicationCount };
}
