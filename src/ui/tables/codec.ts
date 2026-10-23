// A table game travels as short text: each move is its cells, one character each, then a dot and the
// ms since the move before, in base 36. Moves are separated by commas: "agm.1x3,bhn.k2".
import type { Move } from '../../engine/types';

const CELLS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function encodeMoves(moves: readonly Move[], cols: number): string {
  let last = 0;
  return moves.map((m) => {
    const at = Math.round(m.atMs ?? last);
    const cells = m.path.map((p) => CELLS[p.row * cols + p.col]).join('');
    const text = `${cells}.${Math.max(0, at - last).toString(36)}`;
    last = at;
    return text;
  }).join(',');
}

/** The moves back, or null if the text isn't a game. */
export function decodeMoves(text: string, cols: number): Move[] | null {
  if (!text) return [];
  let last = 0;
  const moves: Move[] = [];
  for (const part of text.split(',')) {
    const m = /^([a-zA-Z]{1,10})\.([0-9a-z]{1,8})$/.exec(part);
    if (!m) return null;
    last += parseInt(m[2], 36);
    moves.push({ path: [...m[1]].map((ch) => ({ row: Math.floor(CELLS.indexOf(ch) / cols), col: CELLS.indexOf(ch) % cols })), atMs: last });
  }
  return moves;
}
