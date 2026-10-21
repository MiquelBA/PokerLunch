// Playing a level: moves and the clock go to the Classic engine; the run adds the goals, the win or
// loss, the Poker Rush and the stars. Pure and deterministic, like the engine.
import { allPositions, cellAt } from '../board';
import { applyMove, detonate, tick } from '../game';
import { nextInt } from '../rng';
import type { GameEvent, GameState, Move, Pos } from '../types';
import { countEvents, goalProgress, NO_COUNTERS, type GoalProgress, type TourCounters } from './goals';
import type { Level } from './schema';
import { newLevelGame } from './setup';

/** Poker Rush: each move left is one bomb; in a timed level, each `msPerBomb` left is one. */
export const RUSH = { msPerBomb: 5000, maxBombs: 30 } as const;

export type RunStatus = 'playing' | 'won' | 'lost';

export interface TourRun {
  readonly level: Level;
  /** The game as it started (for 'clear' goals: how many obstacles there were). */
  readonly start: GameState;
  readonly game: GameState;
  readonly counters: TourCounters;
  readonly status: RunStatus;
  /** Points the Rush added (0 until the level is won). */
  readonly rushPoints: number;
  readonly stars: 0 | 1 | 2 | 3;
}

export interface RunResult {
  readonly run: TourRun;
  readonly events: readonly GameEvent[];
  /** The Rush, one entry per bomb, when this move won the level. */
  readonly rush: readonly RushStep[];
}

export interface RushStep {
  readonly pos: Pos;
  readonly events: readonly GameEvent[];
  readonly points: number;
}

export function startRun(level: Level): TourRun {
  const game = newLevelGame(level);
  return { level, start: game, game, counters: NO_COUNTERS, status: 'playing', rushPoints: 0, stars: 0 };
}

export function progress(run: TourRun): GoalProgress[] {
  return run.level.goals.map((g) => goalProgress(g, run.game, run.counters, run.start));
}

export function goalsDone(run: TourRun): boolean {
  return progress(run).every((p) => p.done);
}

export function starsFor(level: Level, passed: boolean, score: number): 0 | 1 | 2 | 3 {
  if (!passed) return 0;
  if (score >= level.stars[1]) return 3;
  if (score >= level.stars[0]) return 2;
  return 1;
}

/** Plays a hand. Winning starts the Rush at once (its steps come back for the UI to play). */
export function playRun(run: TourRun, move: Move): RunResult {
  if (run.status !== 'playing') return { run, events: [], rush: [] };
  const { state, events } = applyMove(run.game, move);
  if (!events.length) return { run, events: [], rush: [] };
  return settle({ ...run, game: state, counters: countEvents(run.counters, events) }, events);
}

/** Advances the clock of a timed level; running out of time without the goals loses it. */
export function tickRun(run: TourRun, ms: number): RunResult {
  if (run.status !== 'playing') return { run, events: [], rush: [] };
  const { state, events } = tick(run.game, ms);
  return settle({ ...run, game: state }, events);
}

function settle(run: TourRun, events: readonly GameEvent[]): RunResult {
  if (goalsDone(run)) {
    const { game, steps } = pokerRush(run.game, leftover(run.game));
    const rushPoints = game.score - run.game.score;
    const won: TourRun = { ...run, game: { ...game, gameOver: true }, status: 'won', rushPoints, stars: starsFor(run.level, true, game.score) };
    return { run: won, events, rush: steps };
  }
  if (run.game.gameOver) return { run: { ...run, status: 'lost' }, events, rush: [] };
  return { run, events, rush: [] };
}

/** Bombs the Rush gets: moves left, or time left in steps of RUSH.msPerBomb. */
export function leftover(game: GameState): number {
  const n = game.config.mode === 'moves'
    ? game.config.maxMoves - game.moves
    : Math.floor(Math.max(0, game.timeLimitMs - game.elapsedMs) / RUSH.msPerBomb);
  return Math.max(0, Math.min(RUSH.maxBombs, n));
}

/** Sets off `bombs` bombs on random cards, one after another. Deterministic: the game's own RNG. */
export function pokerRush(game: GameState, bombs: number): { game: GameState; steps: RushStep[] } {
  const steps: RushStep[] = [];
  let state: GameState = { ...game, gameOver: false };
  for (let i = 0; i < bombs; i++) {
    const cards = allPositions(state.board).filter((p) => {
      const c = cellAt(state.board, p);
      return c && !c.block && !c.ice;
    });
    if (!cards.length) break;
    const [k, rng] = nextInt(state.rngState, cards.length);
    state = { ...state, rngState: rng };
    const before = state.score;
    const r = detonate(state, cards[k]);
    state = r.state;
    steps.push({ pos: cards[k], events: r.events, points: state.score - before });
  }
  return { game: state, steps };
}
