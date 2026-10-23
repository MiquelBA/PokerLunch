// Tables: one board for a group of friends. Whoever opens it plays first and shares the link; each
// player who sits plays the same board once, with the others' games running beside them as ghosts.
// The tables I've played are kept on the phone.
import { DEFAULT_CONFIG } from '../../engine/config';
import type { Move } from '../../engine/types';
import { LEADERBOARD } from '../../leaderboard/config';
import type { Player } from '../../leaderboard/player';
import { fetchTable, openTable, takeSeat } from '../../leaderboard/tables';
import { gameUrl } from '../share';
import { UI } from '../uiConfig';
import { decodeMoves, encodeMoves } from './codec';
import { replaySteps, type Ghost } from './ghosts';

export interface LoadedTable {
  readonly code: string;
  readonly seed: number;
  readonly hostName: string;
  /** Made with other scoring rules: its games can't be replayed any more. */
  readonly old: boolean;
  /** Everyone sitting at it, best first. */
  readonly ghosts: readonly Ghost[];
}

/** The table, or null if there's no such table. Seats whose moves don't make their score are left out. */
export async function loadTable(code: string): Promise<LoadedTable | null> {
  const found = await fetchTable(code);
  if (!found) return null;
  const { table, seats } = found;
  const old = table.rules !== LEADERBOARD.rankingId;
  const ghosts: Ghost[] = [];
  if (!old) {
    for (const seat of seats) {
      const moves = decodeMoves(seat.moves, DEFAULT_CONFIG.cols);
      if (!moves) continue;
      const { score, steps } = replaySteps(table.seed, moves);
      if (score === seat.score) ghosts.push({ playerId: seat.playerId, name: seat.name, score, steps });
    }
  }
  return { code: table.code, seed: table.seed, hostName: table.hostName, old, ghosts };
}

/** Sends a finished game to its table, opening the table first if it's new. */
export async function publishSeat(o: { code: string; seed: number; isNew: boolean; player: Player; score: number; moves: readonly Move[] }): Promise<void> {
  if (o.isNew) {
    await openTable({ code: o.code, rules: LEADERBOARD.rankingId, seed: o.seed, hostId: o.player.id, hostName: o.player.name });
  }
  await takeSeat(o.code, { playerId: o.player.id, name: o.player.name, score: o.score, moves: encodeMoves(o.moves, DEFAULT_CONFIG.cols) });
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
  /** My score there; null while I haven't played it. */
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
