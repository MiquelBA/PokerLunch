// Poker Tour frames: ice and blocks get a crack frame; cards dealt under them appear in place.
import { describe, expect, it } from 'vitest';
import { makeConfig } from '../../engine/config';
import { applyMove, newGame } from '../../engine/game';
import { parseBoard, parseCards } from '../../engine/notation';
import type { Pos } from '../../engine/types';
import { moveFrames } from '../frames';

const P = (row: number, col: number): Pos => ({ row, col });
const cfg = makeConfig({ rows: 3, cols: 3, minValidMoves: 0, goldenChance: 0, varietyLength: 0 });

describe('Tour frames', () => {
  it('a hit on ice adds a crack frame between the hand and the fall', () => {
    const s = newGame({ board: parseBoard('2C~~ 3D 4C\n7S 7H 7D\n9S 8D 5H'), config: cfg, queue: parseCards('AS AH AD AC KS KH') });
    const r = applyMove(s, { path: [P(1, 0), P(1, 1), P(1, 2)] });
    const frames = moveFrames(s.board, r.events, r.state.board);
    expect(frames.map((f) => f.kind)).toEqual(['collect', 'crack', 'fall']);
    expect(frames[1].damage).toEqual([{ pos: P(0, 0), obstacle: 'ice', broken: false }]);
  });

  it('a card dealt under a block comes in where it is, not from above', () => {
    const s = newGame({ board: parseBoard('2C 3D #\n7S 7H 7D\n9S 8D 5H'), config: cfg, queue: parseCards('AS AH AD AC KS KH') });
    const r = applyMove(s, { path: [P(1, 0), P(1, 1), P(1, 2)] });
    const frames = moveFrames(s.board, r.events, r.state.board);
    expect(frames[1]).toMatchObject({ kind: 'crack', damage: [{ pos: P(0, 2), obstacle: 'block', broken: true }] });
    expect(frames[1].ghosts).toHaveLength(1);
    const fall = frames[frames.length - 1];
    const under = fall.tiles.find((t) => t.pos.row === 1 && t.pos.col === 2)!;
    // The block broke in this move, so nothing is anchored above: the card falls from above as usual.
    expect(fall.entering.get(under.card.id)!.row).toBeLessThan(1);
  });

  it('with the block still standing, the card under it appears in place', () => {
    const s = newGame({ board: parseBoard('2C 3D ##\n7S 7H 7D\n9S 8D 5H'), config: cfg, queue: parseCards('AS AH AD AC KS KH') });
    const r = applyMove(s, { path: [P(1, 0), P(1, 1), P(1, 2)] });
    const fall = moveFrames(s.board, r.events, r.state.board).at(-1)!;
    const under = fall.tiles.find((t) => t.pos.row === 1 && t.pos.col === 2)!;
    expect(fall.entering.get(under.card.id)).toEqual(P(1, 2));
  });
});
