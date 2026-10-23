// Tables over Supabase's REST API (supabase/tables.sql): a table is a board (its seed) that someone
// opened; each player who sits at it, the host too, has the same tries until the table closes (older
// tables: no limit). Every try is counted when it starts and the seat keeps the best game. The game
// only reads the tables: every write is one of the database's functions.
import { request, type Fetch } from './api';

export interface TableRow {
  readonly code: string;
  readonly rules: string;
  readonly seed: number;
  readonly hostId: string;
  readonly hostName: string;
}

export interface TableInfo extends TableRow {
  /** Tries each player has; null on old tables (no limit). */
  readonly maxAttempts: number | null;
  /** When it closes (ms since 1970); null on old tables (never). */
  readonly closesAt: number | null;
}

export interface SeatRow {
  readonly playerId: string;
  readonly name: string;
  /** The best game; null until the first one is finished. */
  readonly score: number | null;
  readonly moves: string | null;
  /** Tries started, the one being played included. */
  readonly attempts: number;
  /** A try was started (ms since 1970) and hasn't been sent: being played, or left halfway. */
  readonly openSince: number | null;
  /** The try that first beat the host, and the time played up to then; null if not yet. */
  readonly beatAttempt: number | null;
  readonly beatMs: number | null;
  /** The try that made the best game (null on seats from before it was kept). */
  readonly bestAttempt: number | null;
}

/** A new table's code: 8 random letters and digits. */
export function newTableCode(): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(8);
  try {
    crypto.getRandomValues(bytes);
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return [...bytes].map((b) => chars[b % chars.length]).join('');
}

const rpc = (name: string, args: Record<string, unknown>, fetcher?: Fetch) =>
  request(`rpc/${name}`, { method: 'POST', body: JSON.stringify(args) }, fetcher);

/** Opens a new table, before anyone plays it (the server sets its tries and when it closes). */
export async function createTable(table: TableRow, fetcher?: Fetch): Promise<void> {
  await rpc('poker_create_table', {
    p_code: table.code, p_rules: table.rules, p_seed: table.seed, p_player: table.hostId, p_name: table.hostName,
  }, fetcher);
}

/** Starts a try (taking the seat the first time) and returns the key that sends its game. */
export async function sit(code: string, player: { id: string; name: string }, fetcher?: Fetch): Promise<string> {
  return (await rpc('poker_sit', { p_code: code, p_player: player.id, p_name: player.name }, fetcher)).json() as Promise<string>;
}

/** Sends a try's game at its end; the seat keeps it if it's the best. */
export async function finishSeat(key: string, game: { score: number; moves: string }, fetcher?: Fetch): Promise<void> {
  await rpc('poker_finish', { p_key: key, p_score: game.score, p_moves: game.moves }, fetcher);
}

/** The table and everyone sitting at it, best first; null if there is no such table. */
export async function fetchTable(code: string, fetcher?: Fetch): Promise<{ table: TableInfo; seats: SeatRow[] } | null> {
  const c = encodeURIComponent(code);
  const [tables, seats] = await Promise.all([
    request(`poker_tables?select=code,rules,seed,host_id,host_name,max_attempts,closes_at&code=eq.${c}`, {}, fetcher).then((r) => r.json()),
    request(`poker_seats?select=player_id,name,score,moves,attempts,attempt_at,attempt_open,beat_attempt,beat_ms,best_attempt&table_code=eq.${c}&order=score.desc.nullslast,best_attempt.asc.nullslast,created_at.asc&limit=100`, {}, fetcher).then((r) => r.json()),
  ]) as [
    { code: string; rules: string; seed: number; host_id: string; host_name: string; max_attempts: number | null; closes_at: string | null }[],
    {
      player_id: string; name: string; score: number | null; moves: string | null; attempts: number;
      attempt_at: string; attempt_open: boolean; beat_attempt: number | null; beat_ms: number | null; best_attempt: number | null;
    }[],
  ];
  const t = tables[0];
  if (!t) return null;
  return {
    table: {
      code: t.code, rules: t.rules, seed: Number(t.seed), hostId: t.host_id, hostName: t.host_name,
      maxAttempts: t.max_attempts, closesAt: t.closes_at === null ? null : Date.parse(t.closes_at),
    },
    seats: seats.map((s) => ({
      playerId: s.player_id, name: s.name, score: s.score, moves: s.moves, attempts: s.attempts,
      openSince: s.attempt_open ? Date.parse(s.attempt_at) : null,
      beatAttempt: s.beat_attempt, beatMs: s.beat_ms === null ? null : Number(s.beat_ms), bestAttempt: s.best_attempt,
    })),
  };
}
