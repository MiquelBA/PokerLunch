import { describe, expect, it } from 'vitest';
import { cardsOf } from '../board';
import { makeConfig } from '../config';
import { applyMove, findHands, newGame, replay, tick, traceStatus } from '../game';
import { formatBoard, parseBoard, parseCards } from '../notation';
import type { GameEvent, Pos } from '../types';

const P = (row: number, col: number): Pos => ({ row, col });
const noShuffle = makeConfig({ rows: 3, cols: 3, minValidMoves: 0, goldenChance: 0 });

describe('a played hand', () => {
  it('clears its cards, lets the rest fall and deals new ones', () => {
    const board = parseBoard(`
      2S 3S 4S
      5H 6H 8C
      7S 7H 7D`);
    const s = newGame({ board, config: noShuffle, queue: parseCards('AS AH AD') });
    const { state, events } = applyMove(s, { path: [P(2, 0), P(2, 1), P(2, 2)] });
    expect(formatBoard(state.board)).toBe('AS AH AD\n2S 3S 4S\n5H 6H 8C');
    const hand = events.find((e) => e.type === 'hand')!;
    expect(hand.type === 'hand' && hand.hand).toBe('trips');
    // 150 + (7 × 3) × 1 pip
    expect(state.score).toBe(171);
  });

  it('works traced in any order and through diagonals', () => {
    const board = parseBoard(`
      7S 2C 3D
      4H 7H 5C
      6D 9S 7D`);
    const s = newGame({ board, config: noShuffle, queue: parseCards('AS AH AD') });
    const { events } = applyMove(s, { path: [P(2, 2), P(1, 1), P(0, 0)] });
    expect(events.some((e) => e.type === 'hand')).toBe(true);
  });

  it('rejects paths that are not a hand or not connected', () => {
    const board = parseBoard(`
      7S 2C 7D
      4H 9H 5C
      7H 9S 8D`);
    const s = newGame({ board, config: noShuffle });
    expect(applyMove(s, { path: [P(0, 0), P(0, 1), P(0, 2)] }).events).toEqual([]);
    expect(applyMove(s, { path: [P(0, 0), P(1, 0)] }).events).toEqual([]);
    // 7S → 7H is not adjacent (two rows apart).
    expect(applyMove(s, { path: [P(0, 2), P(0, 0), P(2, 0)] }).events).toEqual([]);
  });

  it('golden cards double the hand, and speed combos multiply', () => {
    const board = parseBoard(`
      2S 3S 4S
      5H 6H 8C
      7S* 7H 7D`);
    const config = makeConfig({ ...noShuffle });
    const s = newGame({ board, config, queue: parseCards('9S 9H 9D 9C 9S 9H') });
    const first = applyMove(s, { path: [P(2, 0), P(2, 1), P(2, 2)], atMs: 1000 });
    expect(first.state.score).toBe(342);
    const second = applyMove(first.state, { path: [P(0, 0), P(0, 1), P(0, 2)], atMs: 2000 });
    const combo = second.events.find((e) => e.type === 'combo');
    expect(combo && combo.type === 'combo' && combo.multiplier).toBe(1.2);
  });
});

describe('blasts', () => {
  it('quads sweep the row and column of the last card', () => {
    const board = parseBoard(`
      2S 3S 4S 5S
      7S 7H 9C TC
      7D 7C 2D 3D
      4D 5D 6D 8D`);
    const config = makeConfig({ rows: 4, cols: 4, minValidMoves: 0, goldenChance: 0 });
    const s = newGame({ board, config, queue: parseCards('AS '.repeat(16)) });
    const { events } = applyMove(s, { path: [P(1, 0), P(1, 1), P(2, 1), P(2, 0)] });
    const blast = events.find((e) => e.type === 'blast');
    expect(blast?.type === 'blast' && blast.kind).toBe('cross');
    // Row 2 (2D 3D) and column 0 (2S 4D).
    expect(blast?.type === 'blast' && blast.cells.length).toBe(4);
  });

  it('a royal flush clears the whole board', () => {
    const board = parseBoard(`
      TH JH QH
      2C 3C KH
      4D 5D AH`);
    const s = newGame({ board, config: noShuffle, queue: parseCards('2S '.repeat(9)) });
    const { events } = applyMove(s, { path: [P(0, 0), P(0, 1), P(0, 2), P(1, 2), P(2, 2)] });
    const blast = events.find((e) => e.type === 'blast');
    expect(blast?.type === 'blast' && blast.cells.length).toBe(4);
    expect(events.filter((e) => e.type === 'spawn').length).toBe(9);
  });
});

describe('the game', () => {
  it('always deals a playable board with enough hands', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = newGame({ seed });
      expect(findHands(s.board, s.config, 3).length).toBe(3);
      expect(cardsOf(s.board).length).toBe(s.config.rows * s.config.cols);
    }
  });

  it('is deterministic: same seed and moves, same game', () => {
    const play = () => {
      let s = newGame({ seed: 42 });
      const events: GameEvent[] = [];
      for (let i = 0; i < 25; i++) {
        const [h] = findHands(s.board, s.config, 1);
        const r = applyMove(s, { path: h.path, atMs: i * 3000 });
        s = r.state;
        events.push(...r.events);
      }
      return { s, events };
    };
    const a = play();
    const b = play();
    expect(b.s).toEqual(a.s);
    expect(b.events).toEqual(a.events);
    expect(replay({ seed: 42 }, a.s.history)).toEqual(a.s);
  });

  it('keeps the board full and playable through random games', () => {
    for (let seed = 1; seed <= 10; seed++) {
      let s = newGame({ seed });
      for (let i = 0; i < 40; i++) {
        const hands = findHands(s.board, s.config, 40);
        const pick = hands[(i * 7919 + seed) % hands.length];
        s = applyMove(s, { path: pick.path }).state;
        expect(cardsOf(s.board).length).toBe(s.config.rows * s.config.cols);
        expect(findHands(s.board, s.config, 3).length).toBe(3);
      }
    }
  });

  it('ends when time runs out, and refuses late moves', () => {
    const s = newGame({ seed: 3 });
    const [h] = findHands(s.board, s.config, 1);
    const over = tick(s, s.config.durationMs);
    expect(over.state.gameOver).toBe(true);
    expect(over.events[0].type).toBe('gameOver');
    expect(applyMove(s, { path: h.path, atMs: s.config.durationMs + 1 }).events).toEqual([]);
  });
});

describe('variety: three different hands in a row', () => {
  const ready = (hand: 'trips' | 'flush' | 'fullHouse' | 'straight' | 'quads', board: string, queue = '') => {
    const rows = parseBoard(board);
    const config = makeConfig({ ...noShuffle, rows: rows.length, cols: rows[0].length });
    const s = newGame({ board: rows, config, queue: parseCards(queue) });
    // Two other hands already in the run: this one completes it.
    return { ...s, variety: (['twoPair', 'fiveKind', 'royalFlush'] as const).filter((h) => h !== hand).slice(0, 2) };
  };
  const powerOf = (events: readonly GameEvent[]) => events.find((e) => e.type === 'power');

  it('a repeated hand starts the run again; a completed run fires ×2 and the power', () => {
    const board = parseBoard(`
      2S 3S 4S
      5H 6H 8C
      7S 7H 7D`);
    const s = newGame({ board, config: noShuffle, queue: parseCards('AS AH AD') });
    const repeat = applyMove({ ...s, variety: ['twoPair', 'trips'] }, { path: [P(2, 0), P(2, 1), P(2, 2)] });
    expect(repeat.state.variety).toEqual(['trips']);
    expect(powerOf(repeat.events)).toBeUndefined();
    const done = applyMove({ ...s, variety: ['twoPair', 'flush'] }, { path: [P(2, 0), P(2, 1), P(2, 2)] });
    expect(done.state.variety).toEqual([]);
    expect(done.events.some((e) => e.type === 'variety')).toBe(true);
    expect(done.state.score).toBe(171 * 2);
  });

  it('trips: one of the new cards is a joker', () => {
    const s = ready('trips', `
      2S 3S 4S
      5H 6H 8C
      7S 7H 7D`, 'AS AH AD');
    const { state, events } = applyMove(s, { path: [P(2, 0), P(2, 1), P(2, 2)] });
    const power = powerOf(events);
    expect(power?.type === 'power' && power.power).toBe('joker');
    expect(cardsOf(state.board).filter((c) => c.joker)).toHaveLength(1);
  });

  it('flush: a storm sweeps every card of its suit', () => {
    const s = ready('flush', `
      2H 9H KH 5H JH
      5S 6C 8H 3D 4S
      7S QD 4H 9C TS`, '2C 3C 4C 5C 6C 7C 8C 9C');
    const { state, events } = applyMove(s, { path: [P(0, 0), P(0, 1), P(0, 2), P(0, 3), P(0, 4)] });
    const blast = events.find((e) => e.type === 'blast');
    expect(blast?.type === 'blast' && blast.kind).toBe('storm');
    expect(blast?.type === 'blast' && blast.cells.length).toBe(2);
    expect(cardsOf(state.board).some((c) => c.suit === 1)).toBe(false);
  });

  it('straight: clears the row it ends on', () => {
    const s = ready('straight', `
      5H 6C 7S 8D 2S
      KD QH JS 9C 3D`, '2C 2C 2C 2C 2C 2C 2C 2C 2C');
    const { events } = applyMove(s, { path: [P(0, 0), P(0, 1), P(0, 2), P(0, 3), P(1, 3)] });
    const blast = events.find((e) => e.type === 'blast');
    expect(blast?.type === 'blast' && blast.kind).toBe('row');
    expect(blast?.type === 'blast' && blast.cells.map((c) => c.pos)).toEqual([P(1, 0), P(1, 1), P(1, 2), P(1, 4)]);
  });

  it('full house: the cards of its three turn golden', () => {
    const s = ready('fullHouse', `
      7S 7H 7D 2C 2D
      9S 9H 7C 3S 4S`, '5S 5H 5D 5C 6S');
    const { state, events } = applyMove(s, { path: [P(0, 0), P(0, 1), P(0, 2), P(0, 3), P(0, 4)] });
    const power = powerOf(events);
    expect(power?.type === 'power' && power.power).toBe('gild');
    const sevens = cardsOf(state.board).filter((c) => c.rank === 7);
    expect(sevens.length).toBe(1);
    expect(sevens.every((c) => c.golden)).toBe(true);
  });

  it('quads and up: double points', () => {
    const board = `
      7S 7H 7D
      7C 2S 3D
      4H 5C 6D`;
    const plain = newGame({ board: parseBoard(board), config: noShuffle, queue: parseCards('AS AH AD AC AS AH AD AC') });
    const base = applyMove(plain, { path: [P(1, 0), P(0, 0), P(0, 1), P(0, 2)] });
    const doubled = applyMove(ready('quads', board, 'AS AH AD AC AS AH AD AC'), { path: [P(1, 0), P(0, 0), P(0, 1), P(0, 2)] });
    const handPts = (ev: readonly GameEvent[]) => ev.find((e) => e.type === 'hand')!;
    const a = handPts(base.events), b = handPts(doubled.events);
    // ×2 for the run and ×2 for the power.
    expect(a.type === 'hand' && b.type === 'hand' && b.points).toBe(a.type === 'hand' ? a.points * 4 : 0);
  });
});

describe('tokens', () => {
  const board = `
      7S 7H 7D
      2S 3S 4S
      5H 6H 8C`;
  it('a hand without tokens left cannot be played, and shows as spent', () => {
    const s = newGame({ board: parseBoard(board), config: noShuffle, queue: parseCards('AS AH AD') });
    const empty = { ...s, tokens: { ...s.tokens, trips: 0 } };
    expect(applyMove(empty, { path: [P(0, 0), P(0, 1), P(0, 2)] }).events).toEqual([]);
    // Three sevens could still grow into a full house or quads; with no room to grow, they are spent.
    expect(traceStatus(empty.board, [P(0, 0), P(0, 1), P(0, 2)], empty.config, empty.tokens)).toBe('partial');
    expect(traceStatus(empty.board, [P(0, 0), P(0, 1), P(0, 2)], makeConfig({ ...noShuffle, maxLength: 3 }), empty.tokens)).toBe('spent');
    expect(findHands(empty.board, empty.config, Infinity, empty.tokens).some((h) => h.hand === 'trips')).toBe(false);
  });

  it('a hand spends one token and every other limited hand gets one back', () => {
    const s = newGame({ board: parseBoard(board), config: noShuffle, queue: parseCards('AS AH AD') });
    const start = { ...s, tokens: { ...s.tokens, flush: 0 } };
    const { state } = applyMove(start, { path: [P(0, 0), P(0, 1), P(0, 2)] });
    expect(state.tokens.trips).toBe(s.tokens.trips - 1);
    expect(state.tokens.flush).toBe(1);
    expect(state.tokens.straight).toBe(s.tokens.straight);
  });
});
