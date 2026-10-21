// A level's goals: how far along each one is, read from the game state and the run's counters.
import { cardsOf } from '../board';
import { handStrength } from '../hands';
import { HAND_TYPES, type GameEvent, type GameState } from '../types';
import type { Goal, Obstacle } from './schema';

/** What the board doesn't remember: bombs set off and golden cards played. */
export interface TourCounters {
  readonly bombs: number;
  readonly golden: number;
}

export const NO_COUNTERS: TourCounters = { bombs: 0, golden: 0 };

export function countEvents(c: TourCounters, events: readonly GameEvent[]): TourCounters {
  let { bombs, golden } = c;
  for (const e of events) {
    if (e.type === 'blast' && e.kind === 'bomb') bombs++;
    if (e.type === 'hand') golden += e.cards.filter((x) => x.golden).length;
  }
  return { bombs, golden };
}

/** Obstacles of a kind on the board (cells, not layers). */
export function obstaclesLeft(state: GameState, obstacle: Obstacle): number {
  return cardsOf(state.board).filter((c) => (obstacle === 'ice' ? c.ice : c.block)).length;
}

export interface GoalProgress {
  readonly goal: Goal;
  /** Done so far, out of `target` (for 'clear', obstacles removed out of those at the start). */
  readonly current: number;
  readonly target: number;
  readonly done: boolean;
}

export function goalProgress(goal: Goal, state: GameState, counters: TourCounters, start: GameState): GoalProgress {
  const of = (current: number, target: number): GoalProgress => ({ goal, current: Math.min(current, target), target, done: current >= target });
  switch (goal.type) {
    case 'score': return of(state.score, goal.target);
    case 'hand': return of(state.handCounts[goal.hand], goal.count);
    case 'handAtLeast': {
      const min = handStrength(goal.min);
      return of(HAND_TYPES.filter((h) => handStrength(h) >= min).reduce((n, h) => n + state.handCounts[h], 0), goal.count);
    }
    case 'clear': {
      const total = obstaclesLeft(start, goal.obstacle);
      return of(total - obstaclesLeft(state, goal.obstacle), total);
    }
    case 'bombs': return of(counters.bombs, goal.count);
    case 'golden': return of(counters.golden, goal.count);
  }
}
