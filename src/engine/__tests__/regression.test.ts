// Regression guard for the Classic game and the Daily challenge: recorded games (seed + a fixed bot)
// must give exactly the same scores, boards and events as when the snapshots were taken. Poker Tour
// work adds options to the engine; with those options absent nothing here may change.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, makeConfig } from '../config';
import { applyMove, findHands, newGame, tick } from '../game';
import { formatBoard } from '../notation';
import type { GameConfig, GameEvent, GameState } from '../types';

/** Plays a game with a simple deterministic bot: the first hand found, one every 1.7 s. */
function playRecorded(seed: number, config: GameConfig, maxMoves: number) {
  let s: GameState = newGame({ seed, config });
  const events: GameEvent[] = [];
  for (let i = 0; i < maxMoves && !s.gameOver; i++) {
    const hands = findHands(s.board, s.config, 6, s.tokens);
    if (!hands.length) break;
    // Not always the first hand, so tokens, variety and powers all come into play.
    const pick = hands[(seed + i) % hands.length];
    s = tick(s, 1700).state;
    const r = applyMove(s, { path: pick.path, atMs: s.elapsedMs });
    events.push(...r.events);
    s = r.state;
  }
  const digest = createHash('sha256').update(JSON.stringify(events)).digest('hex').slice(0, 16);
  return { score: s.score, moves: s.moves, shuffles: s.shuffles, board: formatBoard(s.board), handCounts: s.handCounts, events: events.length, digest };
}

describe('regression: Classic (time mode, default rules)', () => {
  for (const seed of [1, 7, 42, 1234, 99999]) {
    it(`seed ${seed}`, () => {
      expect(playRecorded(seed, DEFAULT_CONFIG, 40)).toMatchSnapshot();
    });
  }
});

describe('regression: Daily challenge seeds', () => {
  // dailySeed('2026-10-21') and dailySeed('2026-12-25'), fixed here so the test doesn't depend on the UI.
  for (const seed of [1290413839, 377260263]) {
    it(`seed ${seed}`, () => {
      expect(playRecorded(seed, DEFAULT_CONFIG, 40)).toMatchSnapshot();
    });
  }
});

describe('regression: moves mode (simulator)', () => {
  it('seed 1000', () => {
    expect(playRecorded(1000, makeConfig({ mode: 'moves', maxMoves: 30 }), 40)).toMatchSnapshot();
  });
});
