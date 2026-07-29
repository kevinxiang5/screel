/**
 * Opens the native DeviceActivityReport sheet for tracked apps (this week vs prior).
 * Web / simulator: returns false so UI can show a fallback.
 */
import { Capacitor } from '@capacitor/core';
import { ScreelScreenTime } from '../../native/ScreelScreenTime';

export async function presentTopAppsReport(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await ScreelScreenTime.presentUsageReport();
    return Boolean(result.shown);
  } catch {
    return false;
  }
}
