import type { CapacitorConfig } from '@capacitor/cli';

// The native apps (App Store, Google Play) wrap the same build as the web game (`npm run build` → dist/).
const config: CapacitorConfig = {
  appId: 'com.pokerlunch.app',
  appName: 'Poker Lunch',
  webDir: 'dist',
  backgroundColor: '#0B3B2E',
  plugins: {
    SplashScreen: { launchShowDuration: 600, backgroundColor: '#0B3B2E', showSpinner: false },
  },
};

export default config;
