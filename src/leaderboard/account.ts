// The player's account (app only): an anonymous Supabase Auth user, made the first time the app opens,
// with no e-mail or password. Its id becomes the phone's player id, and its profile (name, record and
// Poker Tour progress) is kept on the server, so a reinstall or a new phone (once a sign-in is linked)
// gets it back. Everything here is best-effort: the game never waits on it and works without it.
// Plain fetch against GoTrue and PostgREST (no SDK); the tables are in supabase/accounts.sql.
import { Preferences } from '@capacitor/preferences';
import { EMPTY_PROGRESS, parseProgress, type LevelRecord, type TourProgress } from '../engine/tour/progress';
import { isNative } from '../ui/native';
import { loadBest, saveBest } from '../ui/storage';
import { loadTourProgress, saveTourProgress } from '../ui/tour/progressStore';
import { UI } from '../ui/uiConfig';
import { request, type Fetch } from './api';
import { LEADERBOARD, leaderboardEnabled } from './config';
import { setDeviceId } from './device';
import { cleanName, loadPlayer, savePlayer } from './player';

export interface Session {
  readonly accessToken: string;
  readonly refreshToken: string;
  /** Seconds since 1970 when the access token stops working. */
  readonly expiresAt: number;
  readonly userId: string;
}

export interface Profile {
  readonly name: string | null;
  readonly best: number;
  readonly tour: TourProgress;
}

const SESSION_KEY = 'poker-lunch:session';
/** Lets the browser try accounts too (?accounts=1 once): they are meant for the app. */
const FLAG_KEY = 'poker-lunch:accounts';
/** Refresh the token this long before it ends. */
const EARLY_S = 120;
const PUSH_DELAY_MS = 1500;

export function accountsEnabled(): boolean {
  if (!leaderboardEnabled()) return false;
  if (isNative()) return true;
  try {
    if (new URLSearchParams(window.location.search).get('accounts') === '1') localStorage.setItem(FLAG_KEY, '1');
    return localStorage.getItem(FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

// ---------- The session, kept with the phone's own storage in the app (it outlives a cleared web view).

async function readSession(): Promise<Session | null> {
  try {
    const raw = isNative() ? (await Preferences.get({ key: SESSION_KEY })).value : localStorage.getItem(SESSION_KEY);
    const s = JSON.parse(raw ?? 'null') as Session | null;
    return s && typeof s.accessToken === 'string' && typeof s.refreshToken === 'string' && typeof s.userId === 'string' ? s : null;
  } catch {
    return null;
  }
}

async function writeSession(s: Session | null): Promise<void> {
  try {
    if (isNative()) {
      if (s) await Preferences.set({ key: SESSION_KEY, value: JSON.stringify(s) });
      else await Preferences.remove({ key: SESSION_KEY });
    } else if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage unavailable: a new anonymous user next time.
  }
}

interface AuthAnswer {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
  user: { id: string };
}

async function auth(path: string, body: unknown, fetcher: Fetch): Promise<Session> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LEADERBOARD.timeoutMs);
  try {
    const response = await fetcher(`${LEADERBOARD.url}/auth/v1/${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { apikey: LEADERBOARD.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new AuthError(response.status);
    const a = (await response.json()) as AuthAnswer;
    const expiresAt = a.expires_at ?? Math.floor(Date.now() / 1000) + (a.expires_in ?? 3600);
    return { accessToken: a.access_token, refreshToken: a.refresh_token, expiresAt, userId: a.user.id };
  } finally {
    clearTimeout(timer);
  }
}

class AuthError extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`auth HTTP ${status}`);
    this.status = status;
  }
}

let pending: Promise<Session> | null = null;

/** A working session: the saved one, refreshed when it is about to end, or a new anonymous user. */
export function ensureSession(fetcher: Fetch = fetch): Promise<Session> {
  pending ??= (async () => {
    const saved = await readSession();
    if (saved && saved.expiresAt - EARLY_S > Date.now() / 1000) return saved;
    let s: Session;
    if (saved) {
      try {
        s = await auth('token?grant_type=refresh_token', { refresh_token: saved.refreshToken }, fetcher);
      } catch (e) {
        // A refused refresh token (the user was deleted, or the token was used up) means starting
        // over; a network error keeps the old session for next time.
        if (!(e instanceof AuthError && e.status >= 400 && e.status < 500)) throw e;
        s = await auth('signup', {}, fetcher);
      }
    } else {
      s = await auth('signup', {}, fetcher);
    }
    await writeSession(s);
    return s;
  })().finally(() => {
    pending = null;
  });
  return pending;
}

async function authRequest(path: string, init: RequestInit, fetcher: Fetch): Promise<Response> {
  const s = await ensureSession(fetcher);
  return request(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${s.accessToken}` } }, fetcher);
}

// ---------- The profile.

/** Keeps the best of both sides: the higher record, each level's best stars and score, and the
 *  server's name (it is the one the player last saved anywhere) unless it has none. */
export function mergeProfiles(local: Profile, cloud: Profile | null): Profile {
  if (!cloud) return local;
  const levels: Record<string, LevelRecord> = { ...local.tour.levels };
  for (const [id, c] of Object.entries(cloud.tour.levels)) {
    const l = levels[id];
    levels[id] = l ? { stars: Math.max(l.stars, c.stars) as 1 | 2 | 3, best: Math.max(l.best, c.best) } : c;
  }
  return { name: cloud.name ?? local.name, best: Math.max(local.best, cloud.best), tour: { version: 1, levels } };
}

export function sameProfile(a: Profile, b: Profile): boolean {
  return a.name === b.name && a.best === b.best && JSON.stringify(a.tour) === JSON.stringify(b.tour);
}

function localProfile(): Profile {
  return { name: loadPlayer()?.name ?? null, best: loadBest(UI.bestKey), tour: loadTourProgress() };
}

export async function fetchProfile(fetcher: Fetch = fetch): Promise<Profile | null> {
  const rows = (await (await authRequest('poker_profiles?select=name,best,tour', {}, fetcher)).json()) as
    { name: string | null; best: number; tour: unknown }[];
  const row = rows[0];
  if (!row) return null;
  let tour = EMPTY_PROGRESS;
  try {
    tour = parseProgress(JSON.stringify(row.tour));
  } catch {
    // A broken copy on the server: the phone's own wins.
  }
  return { name: row.name && cleanName(row.name) ? cleanName(row.name) : null, best: Number(row.best) || 0, tour };
}

/** Saves the profile on the server (creates it the first time). The id comes from the token. */
export async function pushProfile(p: Profile, fetcher: Fetch = fetch): Promise<void> {
  const send = (body: Record<string, unknown>) => authRequest('poker_profiles?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  }, fetcher);
  const body = { best: Math.min(p.best, 400000), tour: p.tour };
  try {
    await send(p.name ? { ...body, name: p.name } : body);
  } catch (e) {
    // A name the server refuses (it checks the same banned words) must not lose the rest.
    if (!p.name) throw e;
    await send(body);
  }
}

// ---------- What the app calls.

const listeners = new Set<() => void>();

/** Called when the server brought something new (a better record, Tour levels, a name). */
export function onProfileSynced(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let ready = false;
let timer: ReturnType<typeof setTimeout> | null = null;

/** At start: the session, the phone's id, and the profile merged both ways. */
export async function initAccount(fetcher: Fetch = fetch): Promise<void> {
  if (!accountsEnabled()) return;
  try {
    const s = await ensureSession(fetcher);
    adoptId(s.userId);
    const local = localProfile();
    const merged = mergeProfiles(local, await fetchProfile(fetcher));
    ready = true;
    if (!sameProfile(local, merged)) {
      if (merged.best > local.best) saveBest(UI.bestKey, merged.best);
      saveTourProgress(merged.tour);
      if (merged.name && merged.name !== local.name) savePlayer(merged.name, loadPlayer());
      listeners.forEach((fn) => fn());
    }
    await pushProfile(merged, fetcher);
  } catch {
    // Offline or the server said no: the phone keeps everything and tries again next time.
  }
}

/** The account's id is the phone's player id from now on (scores, tables and stats use it). */
function adoptId(userId: string): void {
  setDeviceId(userId);
  const player = loadPlayer();
  if (player && player.id !== userId) savePlayer(player.name, { id: userId, name: player.name });
}

/** After a new record, a Tour level or a new name: saves the profile soon (one send for a burst). */
export function profileChanged(): void {
  if (!ready) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    pushProfile(localProfile()).catch(() => {
      // Next start merges it again.
    });
  }, PUSH_DELAY_MS);
}

export function accountReady(): boolean {
  return ready;
}

/** Deletes the account and everything it made on the server, then the phone's own copy. */
export async function deleteAccount(fetcher: Fetch = fetch): Promise<void> {
  await authRequest('rpc/poker_delete_account', { method: 'POST', body: '{}' }, fetcher);
  await writeSession(null);
  ready = false;
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '');
    for (const key of keys) if (key.startsWith('poker-lunch:') && key !== FLAG_KEY) localStorage.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}
