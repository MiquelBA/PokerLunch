// Poker Tour: level setup, goals, win/loss, Poker Rush, stars and the validator.
import { describe, expect, it } from 'vitest';
import { cardsOf } from '../board';
import { findHands } from '../game';
import { formatCard } from '../notation';
import type { Level } from '../tour/schema';
import { levelConfig, newLevelGame } from '../tour/setup';
import { leftover, playRun, progress, startRun, starsFor } from '../tour/run';
import { validateLevel } from '../tour/validate';

const base: Level = {
  id: 'test-1',
  name: 'Prova',
  limit: { kind: 'moves', moves: 12 },
  board: { rows: 5, cols: 5, layout: ['.....', '.I.I.', '..B..', '.*.K.', '.....'], fixed: { '0,0': 'AS' } },
  goals: [{ type: 'score', target: 300 }],
  stars: [2000, 6000],
  seed: 4242,
};

describe('level setup', () => {
  it('turns the level into Classic rules without tokens, with variety, in its mode', () => {
    const c = levelConfig(base);
    expect(c.mode).toBe('moves');
    expect(c.maxMoves).toBe(12);
    expect(c.hands.flush.tokens).toBeUndefined();
    expect(c.varietyLength).toBe(3);
    expect(c.maxTimeBonusMs).toBe(0);
  });

  it('places the layout and fixed cards, the same way every time', () => {
    const a = newLevelGame(base);
    const b = newLevelGame(base);
    expect(a.board).toEqual(b.board);
    expect(formatCard(a.board[0][0]!)).toBe('AS');
    expect(a.board[1][1]?.ice).toBe(1);
    expect(a.board[3][3]?.ice).toBe(2);
    expect(a.board[2][2]?.block).toBe(1);
    expect(a.board[3][1]?.bomb).toBe(true);
    expect(cardsOf(a.board).length).toBe(25);
  });
});

/** Plays the first hand found until the run ends. */
function playOut(level: Level) {
  let run = startRun(level);
  let last;
  while (run.status === 'playing') {
    const hands = findHands(run.game.board, run.game.config, 1, run.game.tokens);
    if (!hands.length) break;
    last = playRun(run, { path: hands[0].path });
    run = last.run;
  }
  return { run, last };
}

describe('playing a level', () => {
  it('wins when the goals are met, and the Rush turns the moves left into bombs', () => {
    const { run, last } = playOut(base);
    expect(run.status).toBe('won');
    expect(progress(run).every((p) => p.done)).toBe(true);
    const left = 12 - run.game.moves;
    expect(left).toBeGreaterThan(0);
    expect(last!.rush.length).toBe(left);
    expect(run.rushPoints).toBe(last!.rush.reduce((n, s) => n + s.points, 0));
    expect(run.rushPoints).toBeGreaterThan(0);
    expect(run.stars).toBe(starsFor(base, true, run.game.score));
  });

  it('loses when the moves run out first', () => {
    const { run } = playOut({ ...base, goals: [{ type: 'score', target: 1_000_000 }], stars: [2_000_000, 3_000_000] });
    expect(run.status).toBe('lost');
    expect(run.stars).toBe(0);
    expect(run.game.moves).toBe(12);
  });

  it('counts hand goals', () => {
    const { run } = playOut({ ...base, goals: [{ type: 'handAtLeast', min: 'twoPair', count: 2 }] });
    expect(run.status).toBe('won');
    expect(run.game.moves).toBe(2);
  });

  it('the same level played the same way gives the same Rush', () => {
    expect(playOut(base).run.game.score).toBe(playOut(base).run.game.score);
  });

  it('stars: 1 for passing, 2 and 3 at the level\'s scores', () => {
    expect(starsFor(base, false, 99999)).toBe(0);
    expect(starsFor(base, true, 10)).toBe(1);
    expect(starsFor(base, true, 2000)).toBe(2);
    expect(starsFor(base, true, 6000)).toBe(3);
  });

  it('timed levels give one Rush bomb per 5 s left', () => {
    const timed = startRun({ ...base, limit: { kind: 'time', ms: 60_000 } });
    expect(leftover(timed.game)).toBe(12);
  });
});

describe('validator', () => {
  it('accepts a good level', () => {
    expect(validateLevel(base)).toEqual([]);
  });

  it('reports what is wrong', () => {
    const bad: Level = {
      ...base,
      board: { rows: 5, cols: 5, layout: ['.....', '..Q..', '.....', '.....'], fixed: { '9,9': 'ZZ' } },
      goals: [{ type: 'clear', obstacle: 'ice' }],
      stars: [5000, 4000],
    };
    const problems = validateLevel(bad).join('\n');
    expect(problems).toMatch(/layout has 4 rows/);
    expect(problems).toMatch(/unknown 'Q'/);
    expect(problems).toMatch(/fixed 9,9 is off the board/);
    expect(problems).toMatch(/bad card 'ZZ'/);
    expect(problems).toMatch(/star scores must go up/);
    expect(problems).toMatch(/clears ice but the board has none/);
  });
});
