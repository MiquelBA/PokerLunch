// Tables: a game saved as text replays to exactly the same score, and the ghosts follow it in time.
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../../engine/config';
import { applyMove, findHands, newGame, tick } from '../../engine/game';
import type { GameState } from '../../engine/types';
import { decodeMoves, encodeMoves } from '../tables/codec';
import { ghostScoreAt, replaySteps, stepsBy, type Ghost } from '../tables/ghosts';

/** Plays like the screen does: uneven frame times, and a whole-ms move time (Math.ceil). */
function playLikeTheScreen(seed: number): GameState {
  let s = newGame({ seed, config: DEFAULT_CONFIG });
  let frame = 0;
  while (!s.gameOver) {
    // 1 to 3 s between hands, in frames of 16.6 ms or so.
    const wait = 1000 + ((seed * 7 + s.moves * 13) % 2000);
    for (let t = 0; t < wait && !s.gameOver; t += 16.7) s = tick(s, 16.6 + (frame++ % 3) * 0.05).state;
    if (s.gameOver) break;
    const hands = findHands(s.board, s.config, 6, s.tokens);
    if (!hands.length) break;
    s = applyMove(s, { path: hands[(seed + s.moves) % hands.length].path, atMs: Math.ceil(s.elapsedMs) }).state;
  }
  return s;
}

describe('tables', () => {
  it('moves survive the text', () => {
    const s = playLikeTheScreen(11);
    const text = encodeMoves(s.history, DEFAULT_CONFIG.cols);
    expect(text).toMatch(/^[a-zA-Z0-9.,]*$/);
    expect(text.length).toBeLessThan(4000);
    expect(decodeMoves(text, DEFAULT_CONFIG.cols)).toEqual(s.history);
  });

  it('a saved game replays to the same score', () => {
    for (const seed of [3, 42, 2024, 99991]) {
      const s = playLikeTheScreen(seed);
      expect(s.moves).toBeGreaterThan(10);
      const moves = decodeMoves(encodeMoves(s.history, DEFAULT_CONFIG.cols), DEFAULT_CONFIG.cols)!;
      const r = replaySteps(seed, moves);
      expect(r.score).toBe(s.score);
      expect(r.steps).toHaveLength(s.moves);
    }
  });

  it('refuses text that is not a game', () => {
    expect(decodeMoves('abc', 5)).toBeNull();
    expect(decodeMoves('a1.2', 5)).toBeNull();
    expect(decodeMoves('', 5)).toEqual([]);
  });

  it('a ghost scores as it went', () => {
    const s = playLikeTheScreen(5);
    const { score, steps } = replaySteps(5, s.history);
    const ghost: Ghost = { playerId: 'x', name: 'Anna', score, steps };
    expect(ghostScoreAt(ghost, 0)).toBe(0);
    expect(stepsBy(ghost, steps[2].atMs)).toBe(3);
    expect(ghostScoreAt(ghost, steps[2].atMs)).toBe(steps[2].score);
    expect(ghostScoreAt(ghost, steps[3].atMs - 1)).toBe(steps[2].score);
    expect(ghostScoreAt(ghost, 1e9)).toBe(score);
  });
});
