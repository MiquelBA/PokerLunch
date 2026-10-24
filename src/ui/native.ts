// Inside the App Store / Google Play app (Capacitor) instead of a browser: the phone's own share menu,
// vibration, status bar and links. In the browser every function here does nothing.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/** The game's public address, for the links the app shares (the app itself has no web address). */
export const SITE_URL = 'https://pokerlunch.com/';

export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** One call at startup: status bar over the felt, splash away, and the phone's links and back button. */
export function initNative(): void {
  if (!isNative()) return;
  void StatusBar.setStyle({ style: Style.Dark }).catch(() => undefined);
  if (Capacitor.getPlatform() === 'android') void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => undefined);
  void SplashScreen.hide().catch(() => undefined);
  // A table's link (…/#t=code) opened from WhatsApp: the same #t= the web version reads.
  void App.addListener('appUrlOpen', ({ url }) => {
    const hash = new URL(url).hash;
    if (hash) window.location.hash = hash;
  });
  // Android's back button sends the app to the background (the game pauses itself) instead of closing it.
  void App.addListener('backButton', () => void App.minimizeApp());
}

/** Plays a vibration pattern (ms on, ms off, …) as taps of the phone's haptic engine. */
export function nativeVibrate(pattern: readonly number[]): void {
  let at = 0;
  pattern.forEach((ms, i) => {
    if (i % 2 === 0) {
      const style = ms < 30 ? ImpactStyle.Light : ms < 100 ? ImpactStyle.Medium : ImpactStyle.Heavy;
      setTimeout(() => void Haptics.impact({ style }).catch(() => undefined), at);
    }
    at += ms;
  });
}
