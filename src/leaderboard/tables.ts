// Tables over Supabase's REST API (supabase/tables.sql): a table is a board (its seed) that someone
// opened; each player who sits at it leaves their score and their moves, once.
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
  readonly score: number;
  readonly moves: string;
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

export async function openTable(table: TableRow, fetcher?: Fetch): Promise<void> {
  await request('poker_tables', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ code: table.code, rules: table.rules, seed: table.seed, host_id: table.hostId, host_name: table.hostName }),
  }, fetcher);
}

/** Refused (RejectedError) when the player already has a seat there, or the name isn't allowed. */
export async function takeSeat(code: string, seat: SeatRow, fetcher?: Fetch): Promise<void> {
  await request('poker_seats', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ table_code: code, player_id: seat.playerId, name: seat.name, score: seat.score, moves: seat.moves }),
  }, fetcher);
}

/** The table and everyone sitting at it, best first; null if there is no such table. */
export async function fetchTable(code: string, fetcher?: Fetch): Promise<{ table: TableRow; seats: SeatRow[] } | null> {
  const c = encodeURIComponent(code);
  const [tables, seats] = await Promise.all([
    request(`poker_tables?select=code,rules,seed,host_id,host_name&code=eq.${c}`, {}, fetcher).then((r) => r.json()),
    request(`poker_seats?select=player_id,name,score,moves&table_code=eq.${c}&order=score.desc,created_at.asc&limit=100`, {}, fetcher).then((r) => r.json()),
  ]) as [{ code: string; rules: string; seed: number; host_id: string; host_name: string }[], { player_id: string; name: string; score: number; moves: string }[]];
  const t = tables[0];
  if (!t) return null;
  return {
    table: { code: t.code, rules: t.rules, seed: Number(t.seed), hostId: t.host_id, hostName: t.host_name },
    seats: seats.map((s) => ({ playerId: s.player_id, name: s.name, score: s.score, moves: s.moves })),
  };
}
