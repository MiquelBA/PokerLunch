import { describe, expect, it } from 'vitest';
import { currentLevelId, EMPTY_PROGRESS, isUnlocked, newlyOpened, parseProgress, recordResult, starsMissing, totalStars } from '../tour/progress';
import type { Level, Tour } from '../tour/schema';

const lvl = (id: string): Level => ({ id, name: id, limit: { kind: 'moves', moves: 10 }, board: { rows: 5, cols: 5 }, goals: [{ type: 'score', target: 1 }], stars: [10, 20], seed: 1 });
const tours: Tour[] = [
  { id: 't1', name: 'A', theme: 'barcelona', levels: [lvl('a1'), lvl('a2')] },
  { id: 't2', name: 'B', theme: 'montecarlo', levels: [lvl('b1')] },
];

describe('tour progress', () => {
  it('opens levels one after another, across tours', () => {
    let p = EMPTY_PROGRESS;
    expect(isUnlocked(tours, p, 'a1')).toBe(true);
    expect(isUnlocked(tours, p, 'a2')).toBe(false);
    p = recordResult(p, 'a1', 1, 100);
    expect(isUnlocked(tours, p, 'a2')).toBe(true);
    expect(isUnlocked(tours, p, 'b1')).toBe(false);
    p = recordResult(p, 'a2', 2, 100);
    expect(isUnlocked(tours, p, 'b1')).toBe(true);
    expect(currentLevelId(tours, p)).toBe('b1');
  });

  it('a tour that asks for stars stays closed until they are earned, replays included', () => {
    const gated: Tour[] = [tours[0], { ...tours[1], starsToOpen: 4 }];
    let p = recordResult(recordResult(EMPTY_PROGRESS, 'a1', 1, 100), 'a2', 2, 100);
    expect(starsMissing(gated[1], p)).toBe(1);
    expect(isUnlocked(gated, p, 'b1')).toBe(false);
    expect(currentLevelId(gated, p)).toBe(null);
    const better = recordResult(p, 'a1', 2, 300);
    expect(isUnlocked(gated, better, 'b1')).toBe(true);
    expect(newlyOpened(gated, p, better).map((t) => t.id)).toEqual(['t2']);
    expect(newlyOpened(gated, better, better)).toEqual([]);
  });

  it('a lost try changes nothing; replays keep the best stars and best score', () => {
    let p = recordResult(EMPTY_PROGRESS, 'a1', 0, 999);
    expect(p).toEqual(EMPTY_PROGRESS);
    p = recordResult(p, 'a1', 3, 500);
    p = recordResult(p, 'a1', 1, 800);
    expect(p.levels.a1).toEqual({ stars: 3, best: 800 });
    expect(totalStars(p)).toBe(3);
  });

  it('reads saved progress and drops anything broken', () => {
    const saved = JSON.stringify({ version: 1, levels: { a1: { stars: 2, best: 50 }, a2: { stars: 7, best: 1 }, b1: 'x' } });
    expect(parseProgress(saved).levels).toEqual({ a1: { stars: 2, best: 50 } });
    expect(parseProgress('{oops')).toEqual(EMPTY_PROGRESS);
    expect(parseProgress(JSON.stringify({ version: 2, levels: {} }))).toEqual(EMPTY_PROGRESS);
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
  });
});
