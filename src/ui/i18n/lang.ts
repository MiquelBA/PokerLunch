// The game's language: chosen once when the page opens, from ?lang=, then the player's choice
// (remembered), then the phone's language. Anything else plays in English. Changing it reloads the page,
// so every text module just reads LANG at load time.
export type Lang = 'ca' | 'es' | 'en';

export const LANGS: readonly Lang[] = ['ca', 'es', 'en'];
/** Each language's name, in that language (for the selector). */
export const LANG_NAMES: Readonly<Record<Lang, string>> = { ca: 'Català', es: 'Español', en: 'English' };

const KEY = 'pokerlunch.lang';
const FALLBACK: Lang = 'en';

const isLang = (v: unknown): v is Lang => typeof v === 'string' && (LANGS as readonly string[]).includes(v);

function fromUrl(): Lang | null {
  try {
    const v = new URLSearchParams(window.location.search).get('lang');
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

function saved(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

/** The first of the phone's languages that the game speaks ('ca-ES' → 'ca'). */
export function fromPhone(languages: readonly string[]): Lang | null {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return null;
}

function detect(): Lang {
  // Tests read the original Catalan texts.
  if (import.meta.env?.MODE === 'test') return fromUrl() ?? 'ca';
  let phone: Lang | null = null;
  try {
    phone = fromPhone(navigator.languages?.length ? navigator.languages : [navigator.language]);
  } catch {
    // Not a browser (tests).
  }
  return fromUrl() ?? saved() ?? phone ?? FALLBACK;
}

export const LANG: Lang = detect();
/** For Intl (numbers, plurals). */
export const LOCALE: string = LANG;

try {
  document.documentElement.lang = LANG;
} catch {
  // Not a browser (tests).
}

/** Picks this language's version of a text table. */
export function pick<T>(tables: Readonly<Record<Lang, T>>): T {
  return tables[LANG];
}

/** Numbers with this language's separators (12.340 / 12,340). */
export function fmt(v: number): string {
  return v.toLocaleString(LOCALE);
}

/** The player's choice: remembered, then the page reloads in that language (without ?lang=). */
export function setLang(lang: Lang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Storage unavailable: the choice lasts until the page reloads.
  }
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('lang');
    window.location.replace(url.href);
  } catch {
    window.location.reload();
  }
}
