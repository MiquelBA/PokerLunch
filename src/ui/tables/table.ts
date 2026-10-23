// Tables: one board for a group of friends. Whoever opens it shares the link first; then everyone,
// the host too, has the same tries on the same board until the table closes, with the others' best
// games running beside them as ghosts. Each try counts, and the best game ranks.
// The tables I've played are kept on the phone.
import { DEFAULT_CONFIG } from '../../engine/config';
import type { Move } from '../../engine/types';
import { LEADERBOARD } from '../../leaderboard/config';
import type { Player } from '../../leaderboard/player';
import { createTable, fetchTable, finishSeat, newTableCode, sit } from '../../leaderboard/tables';
import { gameUrl } from '../share';
import { UI } from '../uiConfig';
import { decodeMoves, encodeMoves } from './codec';
import { replaySteps, type Ghost } from './ghosts';

/** How a player is doing at a table. */
export interface SeatStats {
  readonly attempts: number;
  /** A try is being played right now. */
  readonly playing: boolean;
  /** The try that first beat the host, and the time played up to then; null if not yet. */
  readonly beatAttempt: number | null;
  readonly beatMs: number | null;
}

export interface LoadedTable {
  readonly code: string;
  readonly seed: number;
  readonly hostId: string;
  readonly hostName: string;
  /** Tries each player has; null: no limit (tables from before the limit). */
  readonly maxAttempts: number | null;
  /** When it closes (ms since 1970); null: never. */
  readonly closesAt: number | null;
  /** Made with other scoring rules: its games can't be replayed any more. */
  readonly old: boolean;
  /** Everyone's best game, best first. */
  readonly ghosts: readonly Ghost[];
  /** Who sat but hasn't finished a game yet (playing it, or left it halfway). */
  readonly waiting: readonly { readonly playerId: string; readonly name: string }[];
  /** Everyone's tries, by player. */
  readonly stats: Readonly<Record<string, SeatStats>>;
}

/** The table, or null if there's no such table. Seats whose moves don't make their score are left out. */
export async function loadTable(code: string): Promise<LoadedTable | null> {
  const found = await fetchTable(code);
  if (!found) return null;
  const { table, seats } = found;
  const old = table.rules !== LEADERBOARD.rankingId;
  const ghosts: Ghost[] = [];
  const waiting: LoadedTable['waiting'][number][] = [];
  const stats: Record<string, SeatStats> = {};
  for (const seat of seats) {
    stats[seat.playerId] = {
      attempts: seat.attempts,
      playing: seat.openSince !== null && Date.now() - seat.openSince < UI.tables.playingMs,
      beatAttempt: seat.beatAttempt,
      beatMs: seat.beatMs,
    };
    if (seat.score === null || seat.moves === null) {
      waiting.push({ playerId: seat.playerId, name: seat.name });
      continue;
    }
    const moves = old ? null : decodeMoves(seat.moves, DEFAULT_CONFIG.cols);
    if (!moves) continue;
    const { score, steps } = replaySteps(table.seed, moves);
    if (score === seat.score) ghosts.push({ playerId: seat.playerId, name: seat.name, score, steps });
  }
  return {
    code: table.code, seed: table.seed, hostId: table.hostId, hostName: table.hostName,
    maxAttempts: table.maxAttempts, closesAt: table.closesAt, old, ghosts, waiting, stats,
  };
}

/** The table can't be played any more. */
export function isClosed(t: Pick<LoadedTable, 'closesAt'>, now = Date.now()): boolean {
  return t.closesAt !== null && now >= t.closesAt;
}

/** Tries I have left there; null: no limit. */
export function triesLeft(t: Pick<LoadedTable, 'maxAttempts' | 'stats'>, me: string): number | null {
  return t.maxAttempts === null ? null : Math.max(0, t.maxAttempts - (t.stats[me]?.attempts ?? 0));
}

/** Opens a new table on a fresh board: nobody has played it yet, the host included. */
export async function openNewTable(player: Player, seed: number): Promise<string> {
  const code = newTableCode();
  await createTable({ code, rules: LEADERBOARD.rankingId, seed, hostId: player.id, hostName: player.name });
  rememberTable({ code, host: player.name });
  return code;
}

/** Starts a try: it counts from now on, even if the game is left halfway. Returns the key that sends it. */
export function sitDown(code: string, player: Player): Promise<string> {
  return sit(code, player);
}

/** Sends a finished game to the try started with `seatKey`. */
export async function publishGame(o: { seatKey: string; score: number; moves: readonly Move[] }): Promise<void> {
  await finishSeat(o.seatKey, { score: o.score, moves: encodeMoves(o.moves, DEFAULT_CONFIG.cols) });
}

// ---------------------------------------------------------------- the link

export function tableLink(code: string): string {
  return `${gameUrl()}#t=${code}`;
}

/** The table in the page's address (#t=code), if any. */
export function readTableLink(): string | null {
  return /^#t=([a-z0-9]{6,12})$/.exec(window.location.hash)?.[1] ?? null;
}

/** Takes the table out of the address, so a reload doesn't open it again. */
export function clearTableLink(): void {
  try {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {
    // Not important.
  }
}

// ---------------------------------------------------------------- my tables (on the phone)

export interface MyTable {
  readonly code: string;
  readonly host: string;
  /** My best score there; null while I haven't finished a game. */
  readonly score: number | null;
  readonly at: number;
}

export function loadMyTables(): MyTable[] {
  try {
    const list = JSON.parse(localStorage.getItem(UI.tables.key) ?? '[]') as MyTable[];
    return Array.isArray(list) ? list.filter((t) => t && typeof t.code === 'string') : [];
  } catch {
    return [];
  }
}

/** Takes a table off my list (only on this phone: the table stays for everyone else). */
export function forgetTable(code: string): MyTable[] {
  const all = loadMyTables().filter((t) => t.code !== code);
  try {
    localStorage.setItem(UI.tables.key, JSON.stringify(all));
  } catch {
    // Storage unavailable: nothing to take off.
  }
  return all;
}

/** Puts a table first on the list (a score already there is kept unless a new one comes). */
export function rememberTable(entry: Omit<MyTable, 'at' | 'score'> & { score?: number | null }): MyTable[] {
  const list = loadMyTables();
  const before = list.find((t) => t.code === entry.code);
  const next: MyTable = { code: entry.code, host: entry.host, score: entry.score ?? before?.score ?? null, at: Date.now() };
  const all = [next, ...list.filter((t) => t.code !== entry.code)].slice(0, UI.tables.keep);
  try {
    localStorage.setItem(UI.tables.key, JSON.stringify(all));
  } catch {
    // Storage unavailable: the list lasts this visit only.
  }
  return all;
}
