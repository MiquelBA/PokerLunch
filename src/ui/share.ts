// Sharing (the champion's card, a table's link): the phone's share menu when there is one, WhatsApp otherwise.
import { Share } from '@capacitor/share';
import { isNative, SITE_URL } from './native';
import { STRINGS } from './strings';

/** The game's public address: the folder this page is served from, without ?options. */
export function gameUrl(): string {
  if (isNative()) return SITE_URL;
  return new URL('./', window.location.href).href;
}

/** Shares a text with an address after it (the game's, by default); resolves true if something was shared (or opened). */
export async function shareText(text: string, url: string = gameUrl()): Promise<boolean> {
  if (isNative()) {
    try {
      await Share.share({ title: STRINGS.title, text, url });
      return true;
    } catch {
      // Closed the menu.
      return false;
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: STRINGS.title, text, url });
      return true;
    } catch (error) {
      // The player closed the menu: nothing to do. Any other failure falls back to WhatsApp.
      if (error instanceof DOMException && error.name === 'AbortError') return false;
    }
  }
  window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
  return true;
}
