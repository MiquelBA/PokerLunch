// Turns a move's events into animation frames. Each frame is a board to show plus the cards that
// are leaving it; the board draws a frame by moving every card from where it was to where it is now.
import { applyGravity, isAnchored, mutableCopy } from '../engine/board';
import type { Obstacle } from '../engine/tour/schema';
import type { BlastKind, Board, Card, Cell, GameEvent, HandType, Pos } from '../engine/types';
import { HAND_TIER, UI } from './uiConfig';

export interface Tile {
  readonly card: Card;
  readonly pos: Pos;
}

export interface Ghost {
  readonly card: Card;
  readonly from: Pos;
  /** Where it flies to (cells, may be fractional). */
  readonly to: { readonly row: number; readonly col: number };
  readonly kind: 'collect' | 'blast';
  readonly index: number;
}

export interface HandInfo {
  readonly hand: HandType;
  readonly tier: number;
  readonly path: readonly Pos[];
  readonly points: number;
  readonly combo: number;
  readonly comboMultiplier: number;
  readonly goldenMultiplier: number;
  /** Where the hand's cards gather (cells, fractional). */
  readonly centre: { readonly row: number; readonly col: number };
}

export interface Frame {
  readonly id: number;
  readonly kind: 'idle' | 'collect' | 'blast' | 'crack' | 'fall' | 'shuffle' | 'deal';
  readonly tiles: readonly Tile[];
  readonly ghosts: readonly Ghost[];
  /** New cards and where they come in from (above the board). */
  readonly entering: ReadonlyMap<number, Pos>;
  readonly duration: number;
  readonly hand?: HandInfo;
  readonly blast?: { readonly kind: BlastKind; readonly origin: Pos; readonly count: number; readonly points: number };
  /** Poker Tour: obstacles hit by the move (`broken`: the ice is gone or the block is; fog and chains always go). */
  readonly damage?: readonly { readonly pos: Pos; readonly obstacle: Obstacle; readonly broken: boolean }[];
  /** Poker Tour: the first frame of a Rush bomb (its points, which bomb, out of how many). */
  readonly rush?: { readonly points: number; readonly index: number; readonly total: number; readonly pos: Pos };
}

let nextFrameId = 1;

function obstacleOf(c: Card): Obstacle {
  return c.block ? 'block' : c.ice ? 'ice' : c.fog ? 'fog' : 'chain';
}

export function tilesOf(board: Board): Tile[] {
  const tiles: Tile[] = [];
  board.forEach((row, r) => row.forEach((card, c) => card && tiles.push({ card, pos: { row: r, col: c } })));
  return tiles;
}

export function idleFrame(board: Board): Frame {
  return { id: nextFrameId++, kind: 'idle', tiles: tilesOf(board), ghosts: [], entering: new Map(), duration: 0 };
}

/** A new game: the cards are dealt one by one from above, bottom row first. */
export function dealFrame(board: Board): Frame {
  const rows = board.length;
  const tiles = tilesOf(board);
  const entering = new Map(tiles.map((t) => [t.card.id, { row: t.pos.row - rows - 1, col: t.pos.col }]));
  return { id: nextFrameId++, kind: 'deal', tiles, ghosts: [], entering, duration: dealDuration(tiles.length) };
}

/** When the n-th card dealt starts falling: bottom row first, left to right. */
export function dealDelay(pos: Pos, rows: number, cols: number): number {
  return ((rows - 1 - pos.row) * cols + pos.col) * UI.anim.dealStep;
}

export function dealDuration(cards: number): number {
  return Math.max(0, cards - 1) * UI.anim.dealStep + UI.anim.dealCard;
}

function centreOf(path: readonly Pos[]) {
  return {
    row: path.reduce((s, p) => s + p.row, 0) / path.length,
    col: path.reduce((s, p) => s + p.col, 0) / path.length,
  };
}

/** The frames of one move, starting from the board before it. */
export function moveFrames(before: Board, events: readonly GameEvent[], after: Board): Frame[] {
  const frames: Frame[] = [];
  const board: Cell[][] = mutableCopy(before);
  const comboEvent = events.find((e) => e.type === 'combo');
  const combo = comboEvent?.type === 'combo' ? comboEvent.count : 1;
  let tier = 0;
  for (const e of events) {
    if (e.type === 'hand') {
      tier = HAND_TIER[e.hand];
      const centre = centreOf(e.path);
      for (const p of e.path) board[p.row][p.col] = null;
      frames.push({
        id: nextFrameId++,
        kind: 'collect',
        tiles: tilesOf(board),
        ghosts: e.path.map((p, index) => ({ card: e.cards[index], from: p, to: centre, kind: 'collect', index })),
        entering: new Map(),
        duration: UI.anim.collect[tier],
        hand: {
          hand: e.hand, tier, path: e.path, points: e.points, combo,
          comboMultiplier: e.comboMultiplier, goldenMultiplier: e.goldenMultiplier, centre,
        },
      });
    } else if (e.type === 'blast') {
      for (const { pos } of e.cells) board[pos.row][pos.col] = null;
      frames.push({
        id: nextFrameId++,
        kind: 'blast',
        tiles: tilesOf(board),
        ghosts: e.cells.map(({ card, pos }, index) => {
          // Thrown outwards, away from where the blast started.
          const dr = pos.row - e.origin.row, dc = pos.col - e.origin.col;
          const len = Math.hypot(dr, dc) || 1;
          return { card, from: pos, to: { row: pos.row + (dr / len) * 2.5 - 1, col: pos.col + (dc / len) * 2.5 }, kind: 'blast', index };
        }),
        entering: new Map(),
        duration: UI.anim.blast,
        blast: { kind: e.kind, origin: e.origin, count: e.cells.length, points: e.points },
      });
    } else if (e.type === 'damage') {
      // Ice cracks, blocks chip; a block that breaks crumbles away.
      for (const c of e.cells) board[c.pos.row][c.pos.col] = c.after;
      frames.push({
        id: nextFrameId++,
        kind: 'crack',
        tiles: tilesOf(board),
        ghosts: e.cells.filter((c) => !c.after).map((c, index) => ({ card: c.before, from: c.pos, to: { row: c.pos.row + 0.6, col: c.pos.col }, kind: 'blast', index })),
        entering: new Map(),
        duration: UI.anim.crack,
        damage: e.cells.map((c) => ({
          pos: c.pos,
          obstacle: obstacleOf(c.before),
          broken: c.before.block ? !c.after : c.before.ice ? !c.after?.ice : true,
        })),
      });
    } else if (e.type === 'fall') {
      applyGravity(board);
    } else if (e.type === 'spawn') {
      board[e.pos.row][e.pos.col] = e.card;
    }
  }
  // The fall: cards drop to their places; new ones come in from above, stacked in their column.
  // Under ice or a block (Poker Tour) nothing can fall through: those cards appear where they are.
  const underAnchor = (p: Pos) => board.slice(0, p.row).some((row) => isAnchored(row[p.col]));
  const spawns = events.flatMap((e) => (e.type === 'spawn' ? [e] : []));
  const fromAbove = spawns.filter((s) => !underAnchor(s.pos));
  const perColumn = new Map<number, number>();
  for (const s of fromAbove) perColumn.set(s.pos.col, (perColumn.get(s.pos.col) ?? 0) + 1);
  const entering = new Map<number, Pos>();
  for (const s of spawns) entering.set(s.card.id, underAnchor(s.pos) ? s.pos : { row: s.pos.row - (perColumn.get(s.pos.col) ?? 0), col: s.pos.col });
  frames.push({ id: nextFrameId++, kind: 'fall', tiles: tilesOf(board), ghosts: [], entering, duration: UI.anim.fall + (tier >= 3 ? 120 : 0) });

  // A reshuffle (or a new board) after the fall.
  const regen = events.find((e) => e.type === 'regenerate');
  if (events.some((e) => e.type === 'shuffle')) {
    frames.push({ id: nextFrameId++, kind: 'shuffle', tiles: tilesOf(after), ghosts: [], entering: new Map(), duration: UI.anim.shuffle });
  } else if (regen) {
    const rows = after.length;
    const enter = new Map(tilesOf(after).map((t) => [t.card.id, { row: t.pos.row - rows, col: t.pos.col }]));
    frames.push({ id: nextFrameId++, kind: 'fall', tiles: tilesOf(after), ghosts: [], entering: enter, duration: UI.anim.shuffle });
  }
  return frames;
}
