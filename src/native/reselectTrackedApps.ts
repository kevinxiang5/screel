/**
 * Re-open Apple's FamilyActivityPicker and restart monitoring with the new selection.
 * Web / simulator: returns a clear failure so UI can guide the user.
 */
import { Capacitor } from '@capacitor/core';
import { ScreelScreenTime } from './ScreelScreenTime';

export async function reselectTrackedApps(options: {
  budgetMinutes: number;
  resetHour: number;
  resetMinute: number;
}): Promise<{ ok: boolean; applicationCount?: number; message?: string }> {
  if (!Capacitor.isNativePlatform()) {
    return {
      ok: false,
      message: 'App selection uses Apple Screen Time and only works in the iPhone build.',
    };
  }

  const native = await ScreelScreenTime.isNativeAvailable();
  if (!native.available) {
    return {
      ok: false,
      message: native.reason === 'simulator' ? 'Not available in the simulator.' : 'Screen Time unavailable.',
    };
  }

  const pick = await ScreelScreenTime.presentAppPicker();
  if (!pick.selected) {
    return { ok: false, message: 'No apps selected. Pick only the apps you want Screel to limit.' };
  }

  await ScreelScreenTime.startMonitoring({
    budgetMinutes: Math.max(1, options.budgetMinutes),
    resetUsed: false,
    resetHour: options.resetHour,
    resetMinute: options.resetMinute,
  });

  return { ok: true, applicationCount: pick.applicationCount };
}
