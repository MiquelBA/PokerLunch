// Short vibrations on phones that support them (Android); silently nothing elsewhere.
import { isNative, nativeVibrate } from './native';
import { UI } from './uiConfig';

export function vibrate(kind: keyof typeof UI.haptics): void {
  try {
    if (isNative()) return nativeVibrate(UI.haptics[kind]);
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate?.(UI.haptics[kind]);
  } catch {
    // Not available: no feedback, nothing else changes.
  }
}
