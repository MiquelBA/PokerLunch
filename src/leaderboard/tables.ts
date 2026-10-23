// Tables over Supabase's REST API (supabase/tables.sql): a table is a board (its seed) that someone
// opened; each player who sits at it takes a seat when the game starts and fills it in at the end,
// once. The game only reads the tables: every write is one of the database's functions.
import { request, type Fetch } from './api';

export interface TableRow {
  readonly code: string;
  readonly rules: string;
  readonly seed: number;
  readonly hostId: string;
  readonly hostName: string;
}

export interface SeatRow {
  readonly playerId: string;
  readonly name: string;
  /** Null while the game is being played, or if it was left halfway. */
  readonly score: number | null;
  readonly moves: string | null;
  /** When the seat was taken (ms since 1970). */
  readonly sitAt: number;
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

/** Opens a table with its host's game, already played. */
export async function openTable(table: TableRow, game: { score: number; moves: string }, fetcher?: Fetch): Promise<void> {
  await rpc('poker_open_table', {
    p_code: table.code, p_rules: table.rules, p_seed: table.seed, p_player: table.hostId, p_name: table.hostName,
    p_score: game.score, p_moves: game.moves,
  }, fetcher);
}

/**
 * Takes a seat as the game starts and returns the key that fills it in. Refused (RejectedError, status
 * 409) when the player already has a seat there.
 */
export async function sit(code: string, player: { id: string; name: string }, fetcher?: Fetch): Promise<string> {
  return (await rpc('poker_sit', { p_code: code, p_player: player.id, p_name: player.name }, fetcher)).json() as Promise<string>;
}

/** Fills in a seat at the end of the game. */
export async function finishSeat(key: string, game: { score: number; moves: string }, fetcher?: Fetch): Promise<void> {
  await rpc('poker_finish', { p_key: key, p_score: game.score, p_moves: game.moves }, fetcher);
}

/** The table and everyone sitting at it, best first; null if there is no such table. */
export async function fetchTable(code: string, fetcher?: Fetch): Promise<{ table: TableRow; seats: SeatRow[] } | null> {
  const c = encodeURIComponent(code);
  const [tables, seats] = await Promise.all([
    request(`poker_tables?select=code,rules,seed,host_id,host_name&code=eq.${c}`, {}, fetcher).then((r) => r.json()),
    request(`poker_seats?select=player_id,name,score,moves,created_at&table_code=eq.${c}&order=score.desc.nullslast,created_at.asc&limit=100`, {}, fetcher).then((r) => r.json()),
  ]) as [
    { code: string; rules: string; seed: number; host_id: string; host_name: string }[],
    { player_id: string; name: string; score: number | null; moves: string | null; created_at: string }[],
  ];
  const t = tables[0];
  if (!t) return null;
  return {
    table: { code: t.code, rules: t.rules, seed: Number(t.seed), hostId: t.host_id, hostName: t.host_name },
    seats: seats.map((s) => ({ playerId: s.player_id, name: s.name, score: s.score, moves: s.moves, sitAt: Date.parse(s.created_at) })),
  };
}
