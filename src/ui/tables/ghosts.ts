// The other players at a table, replayed from their moves: their score at each moment of the game
// (the "ghost" that runs beside you) and the big hands they made on the way.
import { DEFAULT_CONFIG } from '../../engine/config';
import { applyMove, newGame, tick } from '../../engine/game';
import type { HandType, Move } from '../../engine/types';

export interface GhostStep {
  readonly atMs: number;
  /** Score after this move. */
  readonly score: number;
  readonly hand: HandType;
}

export interface Ghost {
  readonly playerId: string;
  readonly name: string;
  readonly score: number;
  readonly steps: readonly GhostStep[];
}

/** Replays a game on the table's board. The final score is what the moves really make. */
export function replaySteps(seed: number, moves: readonly Move[]): { score: number; steps: GhostStep[] } {
  let state = newGame({ seed, config: DEFAULT_CONFIG });
  const steps: GhostStep[] = [];
  for (const m of moves) {
    if (m.atMs !== undefined && m.atMs > state.elapsedMs) state = tick(state, m.atMs - state.elapsedMs).state;
    const r = applyMove(state, m);
    const hand = r.events.find((e) => e.type === 'hand');
    if (hand?.type === 'hand') steps.push({ atMs: r.state.elapsedMs, score: r.state.score, hand: hand.hand });
    state = r.state;
  }
  return { score: state.score, steps };
}

/** How many of a ghost's moves have been played by `ms` into the game. */
export function stepsBy(ghost: Ghost, ms: number): number {
  let k = 0;
  while (k < ghost.steps.length && ghost.steps[k].atMs <= ms) k++;
  return k;
}

/** A ghost's score `ms` into the game. */
export function ghostScoreAt(ghost: Ghost, ms: number): number {
  const k = stepsBy(ghost, ms);
  return k ? ghost.steps[k - 1].score : 0;
}
