/**
 * Capacitor plugin API for Screel Screen Time (Family Controls).
 * Implementation lives in ios native code — this is the TypeScript contract + web fallback.
 */
import { registerPlugin } from '@capacitor/core';

export interface ScreelScreenTimePlugin {
  /** Request Family Controls authorization (iOS only). */
  requestAuthorization(): Promise<{ status: 'approved' | 'denied' | 'unavailable' }>;
  /** Today's tracked usage in minutes (Device Activity). */
  getTodayUsageMinutes(): Promise<{ minutes: number }>;
  /** Apply OS shields when the minute bank is empty. */
  applyShieldWhenBroke(options: { broke: boolean }): Promise<void>;
  /** Whether native Screen Time APIs are available on this build. */
  isNativeAvailable(): Promise<{ available: boolean }>;
}

const ScreelScreenTime = registerPlugin<ScreelScreenTimePlugin>('ScreelScreenTime', {
  web: () => ({
    async requestAuthorization() {
      return { status: 'unavailable' as const };
    },
    async getTodayUsageMinutes() {
      return { minutes: 0 };
    },
    async applyShieldWhenBroke() {
      /* no-op on web */
    },
    async isNativeAvailable() {
      return { available: false };
    },
  }),
});

export { ScreelScreenTime };
