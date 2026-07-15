/**
 * Capacitor plugin API for Screel Screen Time (Family Controls).
 * Native iOS implementation: FamilyControls + DeviceActivity + ManagedSettings.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

export type AuthStatus = 'approved' | 'denied' | 'notDetermined' | 'unavailable';

export interface ScreelScreenTimePlugin {
  isNativeAvailable(): Promise<{ available: boolean; reason?: string }>;
  requestAuthorization(): Promise<{ status: AuthStatus; error?: string }>;
  presentAppPicker(): Promise<{ selected: boolean; applicationCount: number }>;
  startMonitoring(options: { budgetMinutes: number; resetUsed?: boolean }): Promise<{
    ok: boolean;
    budgetMinutes?: number;
    eventCount?: number;
  }>;
  stopMonitoring(): Promise<void>;
  resetUsageDay(): Promise<{ minutes: number }>;
  getTodayUsageMinutes(): Promise<{
    minutes: number;
    budgetMinutes: number;
    linked: boolean;
    hasSelection: boolean;
  }>;
  applyShieldWhenBroke(options: { broke: boolean }): Promise<{ broke: boolean }>;
  getLinkStatus(): Promise<{
    authorized: boolean;
    status: AuthStatus;
    hasSelection: boolean;
    linked: boolean;
    minutesUsed: number;
    budgetMinutes: number;
  }>;
}

const webImpl: ScreelScreenTimePlugin = {
  async isNativeAvailable() {
    return { available: false, reason: 'web' };
  },
  async requestAuthorization() {
    return { status: 'unavailable' };
  },
  async presentAppPicker() {
    return { selected: false, applicationCount: 0 };
  },
  async startMonitoring() {
    return { ok: false };
  },
  async stopMonitoring() {
    /* no-op */
  },
  async resetUsageDay() {
    return { minutes: 0 };
  },
  async getTodayUsageMinutes() {
    return { minutes: 0, budgetMinutes: 0, linked: false, hasSelection: false };
  },
  async applyShieldWhenBroke() {
    return { broke: false };
  },
  async getLinkStatus() {
    return {
      authorized: false,
      status: 'unavailable',
      hasSelection: false,
      linked: false,
      minutesUsed: 0,
      budgetMinutes: 0,
    };
  },
};

const nativePlugin = registerPlugin<ScreelScreenTimePlugin>('ScreelScreenTime', {
  web: () => webImpl,
});

/** Capacitor can hang forever if the native plugin isn't linked — never await bare. */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout: T,
  onError: T,
): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(onTimeout), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        window.clearTimeout(timer);
        resolve(onError);
      });
  });
}

export const ScreelScreenTime: ScreelScreenTimePlugin = {
  isNativeAvailable() {
    if (!Capacitor.isNativePlatform()) return webImpl.isNativeAvailable();
    return withTimeout(
      nativePlugin.isNativeAvailable(),
      2500,
      { available: false, reason: 'timeout' },
      { available: false, reason: 'unimplemented' },
    );
  },
  requestAuthorization() {
    if (!Capacitor.isNativePlatform()) return webImpl.requestAuthorization();
    const fail = { status: 'unavailable' as const, error: 'Authorization unavailable' };
    return withTimeout(nativePlugin.requestAuthorization(), 60_000, {
      status: 'unavailable',
      error: 'Authorization timed out',
    }, fail);
  },
  presentAppPicker() {
    if (!Capacitor.isNativePlatform()) return webImpl.presentAppPicker();
    const empty = { selected: false, applicationCount: 0 };
    return withTimeout(nativePlugin.presentAppPicker(), 120_000, empty, empty);
  },
  startMonitoring(options) {
    if (!Capacitor.isNativePlatform()) return webImpl.startMonitoring(options);
    return withTimeout(nativePlugin.startMonitoring(options), 8000, { ok: false }, { ok: false });
  },
  stopMonitoring() {
    if (!Capacitor.isNativePlatform()) return webImpl.stopMonitoring();
    return withTimeout(
      nativePlugin.stopMonitoring(),
      5000,
      undefined as unknown as void,
      undefined as unknown as void,
    );
  },
  resetUsageDay() {
    if (!Capacitor.isNativePlatform()) return webImpl.resetUsageDay();
    return withTimeout(nativePlugin.resetUsageDay(), 5000, { minutes: 0 }, { minutes: 0 });
  },
  getTodayUsageMinutes() {
    if (!Capacitor.isNativePlatform()) return webImpl.getTodayUsageMinutes();
    const empty = { minutes: 0, budgetMinutes: 0, linked: false, hasSelection: false };
    return withTimeout(nativePlugin.getTodayUsageMinutes(), 5000, empty, empty);
  },
  applyShieldWhenBroke(options) {
    if (!Capacitor.isNativePlatform()) return webImpl.applyShieldWhenBroke(options);
    const result = { broke: options.broke };
    return withTimeout(nativePlugin.applyShieldWhenBroke(options), 5000, result, result);
  },
  getLinkStatus() {
    if (!Capacitor.isNativePlatform()) return webImpl.getLinkStatus();
    const empty = {
      authorized: false,
      status: 'unavailable' as const,
      hasSelection: false,
      linked: false,
      minutesUsed: 0,
      budgetMinutes: 0,
    };
    return withTimeout(nativePlugin.getLinkStatus(), 5000, empty, empty);
  },
};
