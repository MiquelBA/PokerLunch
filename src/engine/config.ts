// Every game value lives here (REGLES.md). No magic numbers in the engine or the UI.
import type { GameConfig } from './types';

export const DEFAULT_CONFIG: GameConfig = {
  // 5×5: real cards big enough to read on a phone, and fewer hands within reach (npm run sim).
  rows: 5,
  cols: 5,
  minLength: 3,
  maxLength: 5,
  decks: 2,
  jokersPerShoe: 3,
  goldenChance: 0.04,
  goldenMultiplier: 2,
  hands: {
    twoPair: { points: 100, timeBonusMs: 0, power: 'time', tokens: 2 },
    trips: { points: 150, timeBonusMs: 0, power: 'joker', tokens: 3 },
    straight: { points: 250, timeBonusMs: 0, power: 'row', tokens: 2 },
    flush: { points: 350, timeBonusMs: 0, power: 'storm', tokens: 2 },
    fullHouse: { points: 800, timeBonusMs: 2000, power: 'gild', tokens: 2 },
    quads: { points: 2000, timeBonusMs: 3000, blast: 'cross', power: 'double' },
    straightFlush: { points: 5000, timeBonusMs: 4000, blast: 'suit', power: 'double' },
    fiveKind: { points: 10000, timeBonusMs: 4000, blast: 'rank', power: 'double' },
    royalFlush: { points: 20000, timeBonusMs: 5000, blast: 'board', power: 'double' },
  },
  pointsPerPip: 1,
  blastPointsPerCard: 40,
  // Three different hands in a row: ×2 and the third hand's power (REGLES.md).
  varietyLength: 3,
  varietyMultiplier: 2,
  powerTimeMs: 3000,
  comboWindowMs: 2500,
  comboMultipliers: [1, 1.2, 1.5, 2],
  minValidMoves: 3,
  maxShuffleAttempts: 20,
  mode: 'time',
  durationMs: 120_000,
  maxTimeBonusMs: 20_000,
  maxMoves: 30,
};

export function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}
