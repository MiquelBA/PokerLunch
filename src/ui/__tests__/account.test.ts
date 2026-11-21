// The account: the merge keeps the best of the phone and the server, and the session is made, kept and
// refreshed against a fake server.
import { beforeEach, describe, expect, it } from 'vitest';
import { deleteAccount, ensureSession, fetchProfile, mergeProfiles, pushProfile, type Profile } from '../../leaderboard/account';
import type { Fetch } from '../../leaderboard/api';

class MemoryStorage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}

interface Call { url: string; init: RequestInit }

function fakeServer(answer: (url: string, init: RequestInit) => { status?: number; body?: unknown }) {
  const calls: Call[] = [];
  const fetcher = (async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const { status = 200, body = null } = answer(url, init);
    return new Response(body === null ? null : JSON.stringify(body), { status });
  }) as unknown as Fetch;
  return { calls, fetcher };
}

const now = () => Math.floor(Date.now() / 1000);
const auth = (id: string, token: string, expiresIn = 3600) => ({
  access_token: token, refresh_token: `r-${token}`, expires_at: now() + expiresIn, user: { id },
});

beforeEach(() => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
});

describe('account merge', () => {
  const local: Profile = { name: 'Anna', best: 5000, tour: { version: 1, levels: { a: { stars: 3, best: 100 }, b: { stars: 1, best: 900 } } } };

  it('keeps the phone when the server has nothing', () => {
    expect(mergeProfiles(local, null)).toEqual(local);
  });

  it('keeps the best of each side', () => {
    const cloud: Profile = { name: 'Anna B', best: 4000, tour: { version: 1, levels: { b: { stars: 2, best: 500 }, c: { stars: 1, best: 10 } } } };
    expect(mergeProfiles(local, cloud)).toEqual({
      name: 'Anna B',
      best: 5000,
      tour: { version: 1, levels: { a: { stars: 3, best: 100 }, b: { stars: 2, best: 900 }, c: { stars: 1, best: 10 } } },
    });
  });

  it('keeps the phone’s name when the server has none', () => {
    expect(mergeProfiles(local, { name: null, best: 0, tour: { version: 1, levels: {} } }).name).toBe('Anna');
  });
});

describe('account session', () => {
  it('signs up once, then reuses the session', async () => {
    const { calls, fetcher } = fakeServer((url) => (url.endsWith('/auth/v1/signup') ? { body: auth('u1', 't1') } : { status: 500 }));
    const a = await ensureSession(fetcher);
    const b = await ensureSession(fetcher);
    expect(a.userId).toBe('u1');
    expect(b).toEqual(a);
    expect(calls).toHaveLength(1);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({});
  });

  it('refreshes a session about to end', async () => {
    let n = 0;
    const { calls, fetcher } = fakeServer((url) => {
      if (url.endsWith('/signup')) return { body: auth('u1', 't1', 30) };
      if (url.includes('grant_type=refresh_token')) return { body: auth('u1', `t${++n + 1}`) };
      return { status: 500 };
    });
    await ensureSession(fetcher);
    const s = await ensureSession(fetcher);
    expect(s.accessToken).toBe('t2');
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ refresh_token: 'r-t1' });
  });

  it('starts over when the refresh token is refused', async () => {
    const { fetcher } = fakeServer((url) => {
      if (url.endsWith('/signup')) return { body: auth(localStorage.getItem('poker-lunch:session') ? 'u2' : 'u1', 't1', 30) };
      return { status: 400 };
    });
    await ensureSession(fetcher);
    expect((await ensureSession(fetcher)).userId).toBe('u2');
  });

  it('keeps the session on a network error', async () => {
    const ok = fakeServer(() => ({ body: auth('u1', 't1', 30) }));
    await ensureSession(ok.fetcher);
    const down = (async () => { throw new TypeError('offline'); }) as unknown as Fetch;
    await expect(ensureSession(down)).rejects.toThrow('offline');
    expect(localStorage.getItem('poker-lunch:session')).toContain('u1');
  });
});

describe('account profile', () => {
  it('reads and saves the profile with the user’s token, never sending the id', async () => {
    const { calls, fetcher } = fakeServer((url, init) => {
      if (url.endsWith('/signup')) return { body: auth('u1', 'tok') };
      if (url.includes('poker_profiles?select')) return { body: [{ name: 'Anna', best: 7, tour: { version: 1, levels: { x: { stars: 2, best: 3 } } } }] };
      if (url.includes('poker_profiles?on_conflict') && init.method === 'POST') return { status: 201 };
      return { status: 500 };
    });
    expect(await fetchProfile(fetcher)).toEqual({ name: 'Anna', best: 7, tour: { version: 1, levels: { x: { stars: 2, best: 3 } } } });
    await pushProfile({ name: 'Anna', best: 9, tour: { version: 1, levels: {} } }, fetcher);
    const push = calls.at(-1)!;
    expect((push.init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(String(push.init.body))).toEqual({ best: 9, tour: { version: 1, levels: {} }, name: 'Anna' });
  });

  it('saves the rest when the server refuses the name', async () => {
    const { calls, fetcher } = fakeServer((url, init) => {
      if (url.endsWith('/signup')) return { body: auth('u1', 'tok') };
      const body = JSON.parse(String(init.body ?? '{}')) as { name?: string };
      return body.name ? { status: 400 } : { status: 201 };
    });
    await pushProfile({ name: 'Bad', best: 1, tour: { version: 1, levels: {} } }, fetcher);
    expect(JSON.parse(String(calls.at(-1)!.init.body))).toEqual({ best: 1, tour: { version: 1, levels: {} } });
  });

  it('deleting the account clears the phone too', async () => {
    const { calls, fetcher } = fakeServer((url) => (url.endsWith('/signup') ? { body: auth('u1', 'tok') } : { status: 204 }));
    localStorage.setItem('poker-lunch:best', '50');
    localStorage.setItem('pokerlunch.lang', 'es');
    await deleteAccount(fetcher);
    expect(calls.at(-1)!.url).toContain('/rest/v1/rpc/poker_delete_account');
    expect(localStorage.getItem('poker-lunch:best')).toBeNull();
    expect(localStorage.getItem('poker-lunch:session')).toBeNull();
    expect(localStorage.getItem('pokerlunch.lang')).toBe('es');
  });
});
