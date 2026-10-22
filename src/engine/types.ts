// Core engine types (REGLES.md). Pure data: everything here is JSON-serializable.

/** 0 spades, 1 hearts, 2 diamonds, 3 clubs. */
export type Suit = 0 | 1 | 2 | 3;

/** 2..14 (11 J, 12 Q, 13 K, 14 A). */
export type Rank = number;

export interface Pos {
  readonly row: number;
  readonly col: number;
}

/** What a card is, before it gets an id on the board (shoe entries, test queues). */
export interface CardSpec {
  readonly rank: Rank;
  readonly suit: Suit;
  /** Joker: stands in for whatever card the hand needs. Its rank and suit are ignored. */
  readonly joker?: boolean;
  /** Golden card: the hand it is in scores × goldenMultiplier. */
  readonly golden?: boolean;
  /**
   * Poker Tour only (absent in the Classic game). Ice: layers left; a frozen card can't be traced
   * and doesn't fall. A hand next to it, a blast or a bomb takes a layer off.
   */
  readonly ice?: number;
  /** Poker Tour only. Bomb: when the card goes, everything around it (3×3) goes too. */
  readonly bomb?: boolean;
  /** Poker Tour only. A block: not a card, just hits left. Can't be traced, doesn't fall, stops falling cards. */
  readonly block?: number;
  /** Poker Tour only. Fog: the card lies face down and can't be traced; it falls like any card. A hit turns it over. */
  readonly fog?: boolean;
  /**
   * Poker Tour only. Chain: cards with the same link number are chained. They don't fall, and a hand
   * may use one only together with the others; a hit next to one breaks the whole chain.
   */
  readonly chain?: number;
}

export interface Card extends CardSpec {
  readonly id: number;
}

export type Cell = Card | null;

/** Row-major grid: board[row][col]. (0,0) is top-left. */
export type Board = readonly (readonly Cell[])[];

/** Poker hands, weakest first (real poker order). Every card of a traced path must be part of the hand. */
export const HAND_TYPES = [
  'twoPair',
  'trips',
  'straight',
  'flush',
  'fullHouse',
  'quads',
  'straightFlush',
  'fiveKind',
  'royalFlush',
] as const;

export type HandType = (typeof HAND_TYPES)[number];

/** What a hand does to the board besides clearing its own cards. */
export type BlastKind = 'cross' | 'suit' | 'rank' | 'board' | 'row' | 'storm' | 'bomb';

/**
 * What a hand does when it completes a variety run (varietyLength different hands in a row): a joker
 * drops in, extra time, a row blast, a suit storm, a rank turned golden, or double points.
 */
export type PowerKind = 'joker' | 'time' | 'row' | 'storm' | 'gild' | 'double';

export interface HandDef {
  readonly points: number;
  /** Extra game time (time mode). */
  readonly timeBonusMs: number;
  readonly blast?: BlastKind;
  /** What the hand does when it completes a variety run. */
  readonly power: PowerKind;
  /**
   * Tokens: how many times in a row the hand can be played. Each play spends one; playing any other
   * hand gives one back. Undefined = no limit.
   */
  readonly tokens?: number;
}

export type GameMode = 'time' | 'moves';

export interface GameConfig {
  readonly rows: number;
  readonly cols: number;
  readonly minLength: number;
  readonly maxLength: number;
  /** Standard 52-card decks in each shoe. */
  readonly decks: number;
  /** Jokers added to each shoe. */
  readonly jokersPerShoe: number;
  readonly goldenChance: number;
  readonly goldenMultiplier: number;
  /** Poker Tour: chance that a dealt card is a bomb. Absent or 0: never (and no random number drawn). */
  readonly bombChance?: number;
  /** Poker Tour: golden squares of the board. A hand through any of them scores ×2. Absent: none. */
  readonly bonusCells?: readonly Pos[];
  readonly hands: Readonly<Record<HandType, HandDef>>;
  /** Points per pip of the real cards in a hand (an ace is 14). */
  readonly pointsPerPip: number;
  /** Points per card swept away by a hand's blast. */
  readonly blastPointsPerCard: number;
  /** Different hands in a row that make a variety run; the run then starts again. */
  readonly varietyLength: number;
  /** Points multiplier of the hand that completes a variety run. */
  readonly varietyMultiplier: number;
  /** Extra time from the 'time' power. Not counted against maxTimeBonusMs. */
  readonly powerTimeMs: number;
  readonly comboWindowMs: number;
  readonly comboMultipliers: readonly number[];
  readonly minValidMoves: number;
  readonly maxShuffleAttempts: number;
  readonly mode: GameMode;
  readonly durationMs: number;
  readonly maxTimeBonusMs: number;
  readonly maxMoves: number;
}

export interface Move {
  readonly path: readonly Pos[];
  readonly atMs?: number;
}

export type HandCounts = Readonly<Record<HandType, number>>;

export interface GameState {
  readonly config: GameConfig;
  readonly seed: number;
  readonly rngState: number;
  /** Cards still to deal, top first. When it runs out a fresh shoe is shuffled. */
  readonly shoe: readonly CardSpec[];
  /** Fixed deal order for tests; used before the shoe when not empty. */
  readonly queue: readonly CardSpec[];
  readonly nextId: number;
  readonly board: Board;
  readonly score: number;
  readonly moves: number;
  readonly elapsedMs: number;
  readonly timeLimitMs: number;
  readonly timeBonusMs: number;
  readonly lastMoveAtMs: number | null;
  readonly combo: number;
  readonly maxCombo: number;
  readonly bestMove: number;
  readonly bestHand: HandType | null;
  readonly handCounts: HandCounts;
  /** Tokens left for each hand that has a limit (see HandDef.tokens). */
  readonly tokens: HandCounts;
  /** The variety run so far: different hands played in a row. */
  readonly variety: readonly HandType[];
  readonly shuffles: number;
  readonly gameOver: boolean;
  readonly history: readonly Move[];
}

export interface Fall {
  readonly id: number;
  readonly from: Pos;
  readonly to: Pos;
}

export interface GameStats {
  readonly score: number;
  readonly moves: number;
  readonly maxCombo: number;
  readonly bestMove: number;
  readonly bestHand: HandType | null;
  readonly handCounts: HandCounts;
}

export type GameEvent =
  | {
      readonly type: 'hand';
      readonly hand: HandType;
      /** In traced order. */
      readonly path: readonly Pos[];
      readonly cards: readonly Card[];
      readonly points: number;
      readonly comboMultiplier: number;
      readonly goldenMultiplier: number;
      /** Poker Tour: ×2 when the path crosses a golden square. Only when the level has them. */
      readonly cellMultiplier?: number;
    }
  | {
      readonly type: 'blast';
      readonly kind: BlastKind;
      /** Where the blast starts (the last card of the path). */
      readonly origin: Pos;
      readonly cells: readonly { readonly card: Card; readonly pos: Pos }[];
      readonly points: number;
    }
  | { readonly type: 'variety'; readonly hands: readonly HandType[]; readonly multiplier: number }
  | {
      readonly type: 'power';
      readonly hand: HandType;
      readonly power: PowerKind;
      /** Cells it touched: the joker, the golden cards (after the deal). Blasts use a blast event. */
      readonly cells: readonly Pos[];
    }
  | {
      /** Poker Tour: obstacles hit (ice loses layers, blocks lose hits, fog lifts, chains break). `after` is null once a block breaks. */
      readonly type: 'damage';
      readonly cells: readonly { readonly pos: Pos; readonly before: Card; readonly after: Card | null }[];
    }
  | { readonly type: 'fall'; readonly falls: readonly Fall[] }
  | { readonly type: 'spawn'; readonly card: Card; readonly pos: Pos }
  | { readonly type: 'shuffle'; readonly moves: readonly Fall[] }
  | { readonly type: 'regenerate'; readonly board: Board }
  | { readonly type: 'timeBonus'; readonly ms: number; readonly timeLimitMs: number }
  | { readonly type: 'combo'; readonly count: number; readonly multiplier: number }
  | { readonly type: 'moveEnd'; readonly points: number }
  | { readonly type: 'gameOver'; readonly stats: GameStats };

export interface MoveResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}
