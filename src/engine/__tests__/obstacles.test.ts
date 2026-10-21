// Poker Tour board elements in the engine: ice, blocks and bombs.
import { describe, expect, it } from 'vitest';
import { makeConfig } from '../config';
import { applyMove, findHands, newGame, traceStatus } from '../game';
import { formatBoard, parseBoard, parseCards } from '../notation';
import type { Pos } from '../types';

const P = (row: number, col: number): Pos => ({ row, col });
const cfg = makeConfig({ rows: 3, cols: 3, minValidMoves: 0, goldenChance: 0, varietyLength: 0 });

describe('ice', () => {
  it('a frozen card cannot be traced or found as a hand', () => {
    const board = parseBoard(`
      7S~ 2C 3D
      7H 4H 5C
      7D 9S 8D`);
    const s = newGame({ board, config: cfg });
    expect(traceStatus(board, [P(0, 0), P(1, 0), P(2, 0)], cfg)).toBe('invalid');
    expect(applyMove(s, { path: [P(0, 0), P(1, 0), P(2, 0)] }).events).toEqual([]);
    expect(findHands(board, cfg)).toEqual([]);
  });

  it('a hand next to it takes a layer off; with no ice left it is a normal card again', () => {
    const board = parseBoard(`
      2C~~ 3D 4C
      7S 7H 7D
      9S 8D 5H`);
    const s = newGame({ board, config: cfg, queue: parseCards('AS AH AD AC KS KH') });
    const r1 = applyMove(s, { path: [P(1, 0), P(1, 1), P(1, 2)] });
    expect(r1.events.some((e) => e.type === 'damage')).toBe(true);
    // The frozen card holds its place (one layer left); the rest fall and new cards fill the gaps,
    // column by column, bottom first.
    expect(formatBoard(r1.state.board)).toBe('2C~ AH AD\nAS 3D 4C\n9S 8D 5H');
    // A second hand next to it melts the last layer: 2C is a normal card that can fall again.
    const r2 = applyMove(r1.state, { path: [P(1, 0), P(0, 1), P(0, 2)] });
    expect(r2.events.some((e) => e.type === 'hand')).toBe(true);
    expect(r2.state.board.flat().some((c) => c?.ice)).toBe(false);
  });

  it('frozen cards do not fall, and cards above them stop on them; melted ones fall', () => {
    const board = parseBoard(`
      AS 2C 3D
      4H~ 8H 5C
      7S 7H 7D`);
    const s = newGame({ board, config: cfg, queue: parseCards('KS KH KD') });
    const r = applyMove(s, { path: [P(2, 0), P(2, 1), P(2, 2)] });
    // The hand next to 4H~ melts its only layer before the fall, so it falls like any card.
    expect(formatBoard(r.state.board)).toBe('KS KH KD\nAS 2C 3D\n4H 8H 5C');
    // With two layers it keeps one and holds its place: the ace stays on it, the cell below is dealt in place.
    const s2 = newGame({ board: parseBoard('AS 2C 3D\n4H~~ 8H 5C\n7S 7H 7D'), config: cfg, queue: parseCards('KS KH KD') });
    const r2 = applyMove(s2, { path: [P(2, 0), P(2, 1), P(2, 2)] });
    expect(formatBoard(r2.state.board)).toBe('AS KH KD\n4H~ 2C 3D\nKS 8H 5C');
  });
});

describe('blocks', () => {
  it('cannot be traced, stop falling cards and break after their hits', () => {
    const board = parseBoard(`
      AS 2C 3D
      ## 4H 5C
      7S 7H 7D`);
    const s = newGame({ board, config: cfg, queue: parseCards('KS KH KD KC') });
    const r1 = applyMove(s, { path: [P(2, 0), P(2, 1), P(2, 2)] });
    // The block took one hit; the ace above it stays; the bottom-left cell is dealt in place.
    expect(r1.state.board[1][0]?.block).toBe(1);
    expect(r1.state.board[0][0]).toMatchObject({ rank: 14, suit: 0 });
    expect(r1.state.board[2][0]).not.toBeNull();
    expect(r1.events.find((e) => e.type === 'damage')).toMatchObject({ cells: [{ pos: P(1, 0), after: { block: 1 } }] });
  });
});

describe('bombs', () => {
  it('a bomb in a hand clears the 3×3 around it and chains to other bombs', () => {
    const big = makeConfig({ rows: 4, cols: 4, minValidMoves: 0, goldenChance: 0, varietyLength: 0 });
    const board2 = parseBoard(`
      2C 3D 4C 5H
      7S 7H! 7D 6D
      8C 9D 2H! 9S
      TC JD QH KS`);
    const s2 = newGame({ board: board2, config: big, queue: parseCards(Array(16).fill('AS').join(' ')) });
    const r = applyMove(s2, { path: [P(1, 0), P(1, 1), P(1, 2)] });
    const bombs = r.events.filter((e) => e.type === 'blast' && e.kind === 'bomb');
    // 7H! goes off, reaches 2H! which goes off too.
    expect(bombs.length).toBe(2);
    // 7H! clears 2C 3D 4C 8C 9D 2H! (the hand's own cards are already gone); 2H! then clears
    // 6D 9S JD QH KS. 11 cards × 40 points.
    const blastCards = bombs.reduce((n, e) => n + (e.type === 'blast' ? e.cells.length : 0), 0);
    expect(blastCards).toBe(11);
    expect(r.state.score).toBe(171 + 11 * 40);
  });

  it('a bomb hits obstacles in its reach instead of clearing them', () => {
    const board = parseBoard(`
      2C ## 4C
      7S 7H! 7D
      8C 9D~ 2H`);
    const s = newGame({ board, config: cfg, queue: parseCards(Array(9).fill('AS').join(' ')) });
    const r = applyMove(s, { path: [P(1, 0), P(1, 1), P(1, 2)] });
    // The block (hit by the hand next to it and by the bomb) breaks; the ice melts.
    expect(r.state.board.flat().some((c) => c?.block)).toBe(false);
    expect(r.state.board.flat().some((c) => c?.ice)).toBe(false);
  });
});

describe('notation', () => {
  it('reads and writes ice, bombs and blocks', () => {
    const text = '7S~~ 7H! #\n## JK 9D*';
    expect(formatBoard(parseBoard(text))).toBe(text);
  });
});
