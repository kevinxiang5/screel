import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.screel.app',
  appName: 'Screel',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  ios: {
    // Web CSS owns notch/home-indicator insets via env(safe-area-inset-*).
    contentInset: 'never',
  },
};

export default config;
