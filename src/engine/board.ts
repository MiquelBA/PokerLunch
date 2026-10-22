// Board helpers: neighbours, gravity and paths. Pure functions over immutable boards.
import type { Board, Card, Cell, Fall, Pos } from './types';

export function samePos(a: Pos, b: Pos): boolean {
  return a.row === b.row && a.col === b.col;
}

/** The 8 surrounding cells, diagonals included. */
export function areNeighbours(a: Pos, b: Pos): boolean {
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  return dr <= 1 && dc <= 1 && dr + dc > 0;
}

export function neighbours(board: Board, p: Pos): Pos[] {
  const out: Pos[] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const q = { row: p.row + dr, col: p.col + dc };
      if (q.row >= 0 && q.col >= 0 && q.row < board.length && q.col < board[0].length) out.push(q);
    }
  }
  return out;
}

export function cellAt(board: Board, p: Pos): Cell {
  return board[p.row]?.[p.col] ?? null;
}

export function mutableCopy(board: Board): Cell[][] {
  return board.map((row) => [...row]);
}

export function allPositions(board: Board): Pos[] {
  const out: Pos[] = [];
  for (let row = 0; row < board.length; row++) for (let col = 0; col < board[0].length; col++) out.push({ row, col });
  return out;
}

/** Ice, blocks and chains hold their cell: they don't fall, and cards above stop on them (Poker Tour). */
export function isAnchored(c: Cell): boolean {
  return !!c && (!!c.block || !!c.ice || !!c.chain);
}

/** What a hit (a hand next to it, a blast, a bomb) wears down instead of sweeping away (Poker Tour). */
export function isObstacle(c: Cell): boolean {
  return !!c && (!!c.block || !!c.ice || !!c.fog || !!c.chain);
}

/** A card that can be part of a traced hand. */
export function isPlayable(c: Cell): c is Card {
  return !!c && !c.block && !c.ice && !c.fog;
}

/** Chained cards go together: a path holding one holds every card of its chain (Poker Tour). */
export function chainsComplete(board: Board, path: readonly Pos[]): boolean {
  const links = new Set(path.map((p) => cellAt(board, p)?.chain).filter((x): x is number => !!x));
  if (!links.size) return true;
  for (const p of allPositions(board)) {
    const link = cellAt(board, p)?.chain;
    if (link && links.has(link) && !path.some((q) => samePos(p, q))) return false;
  }
  return true;
}

/** A path is a chain of distinct, neighbouring cells holding playable cards. */
export function isConnectedPath(board: Board, path: readonly Pos[]): boolean {
  for (let i = 0; i < path.length; i++) {
    if (!isPlayable(cellAt(board, path[i]))) return false;
    if (path.findIndex((q) => samePos(q, path[i])) !== i) return false;
    if (i > 0 && !areNeighbours(path[i - 1], path[i])) return false;
  }
  return true;
}

/** Cards fall to fill the holes in each column, keeping their order. Anchored cells stop them. */
export function applyGravity(board: Cell[][]): Fall[] {
  const falls: Fall[] = [];
  const rows = board.length;
  for (let col = 0; col < board[0].length; col++) {
    let write = rows - 1;
    for (let row = rows - 1; row >= 0; row--) {
      const card = board[row][col];
      if (!card) continue;
      if (isAnchored(card)) {
        write = row - 1;
        continue;
      }
      if (row !== write) {
        board[write][col] = card;
        board[row][col] = null;
        falls.push({ id: card.id, from: { row, col }, to: { row: write, col } });
      }
      write--;
    }
  }
  return falls;
}

/** Empty cells in deal order: column by column, left to right; bottom-most first within a column. */
export function emptyCells(board: Board): Pos[] {
  const out: Pos[] = [];
  for (let col = 0; col < board[0].length; col++) {
    for (let row = board.length - 1; row >= 0; row--) if (!board[row][col]) out.push({ row, col });
  }
  return out;
}

export function cardsOf(board: Board): Card[] {
  return board.flatMap((row) => row.filter((c): c is Card => c !== null));
}
