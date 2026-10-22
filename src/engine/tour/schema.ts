// Poker Tour: levels are data. One shape for every level of every tour, so new levels and tours are
// added without new code (TOUR.md). Everything here is JSON-serializable.
import type { HandType } from '../types';

/**
 * A level's board, one string per row, top first. Each character is a cell:
 *   .  a card dealt from the level's shoe
 *   I  a frozen card (one layer of ice)      K  a frozen card with two layers
 *   B  a block (breaks with one hit)         X  a stone block (two hits)
 *   *  a bomb card                           G  a golden card
 *   J  a joker                               F  a card in fog (face down)
 *   1-9  a chained card: cards with the same digit are on one chain
 * `fixed` sets the card under any cell that holds one ('row,col' → 'AS', notation as in tests),
 * e.g. a frozen ace of spades: layout 'I' plus fixed { '2,2': 'AS' }.
 * `gold` lists the golden squares ('row,col'): a hand through any of them scores ×2.
 */
export interface LevelBoard {
  readonly rows: number;
  readonly cols: number;
  readonly layout?: readonly string[];
  readonly fixed?: Readonly<Record<string, string>>;
  readonly gold?: readonly string[];
}

export type LevelLimit =
  | { readonly kind: 'moves'; readonly moves: number }
  | { readonly kind: 'time'; readonly ms: number };

export type Obstacle = 'ice' | 'block' | 'fog' | 'chain';

export type Goal =
  /** Reach a score. */
  | { readonly type: 'score'; readonly target: number }
  /** Make `count` hands of one type. */
  | { readonly type: 'hand'; readonly hand: HandType; readonly count: number }
  /** Make `count` hands at least as strong as `min` (a full house or better, say). */
  | { readonly type: 'handAtLeast'; readonly min: HandType; readonly count: number }
  /** Clear every obstacle of a kind from the board. */
  | { readonly type: 'clear'; readonly obstacle: Obstacle }
  /** Set off `count` bombs. */
  | { readonly type: 'bombs'; readonly count: number }
  /** Use `count` golden cards in hands. */
  | { readonly type: 'golden'; readonly count: number }
  /** Make `count` hands through golden squares. */
  | { readonly type: 'squares'; readonly count: number };

export interface Level {
  /** Unique and stable (progress is saved under it): 't1-07'. */
  readonly id: string;
  readonly name: string;
  /** Levels 10, 20 and 30: special challenges. */
  readonly special?: boolean;
  readonly limit: LevelLimit;
  readonly board: LevelBoard;
  /** The shoe: defaults to the Classic game's (2 decks, 3 jokers, 4% golden, no bombs). */
  readonly deck?: { readonly jokersPerShoe?: number; readonly goldenChance?: number; readonly bombChance?: number };
  /** Classic rules a level can switch on. Defaults: no tokens, variety run on, no time bonuses. */
  readonly rules?: { readonly tokens?: boolean; readonly variety?: boolean; readonly timeBonus?: boolean };
  /** All must be met to pass the level (one star). */
  readonly goals: readonly Goal[];
  /** Scores for the second and third stars. */
  readonly stars: readonly [number, number];
  /** The random cards: the same seed deals the same level for everyone. */
  readonly seed: number;
  /** One line shown before the level starts. */
  readonly intro?: string;
}

export type TourTheme = 'barcelona' | 'montecarlo' | 'london' | 'macau' | 'atlantic' | 'vegas';

export interface Tour {
  readonly id: string;
  readonly name: string;
  readonly theme: TourTheme;
  /** Stars needed (over all tours) to open it, on top of passing the level before. */
  readonly starsToOpen?: number;
  readonly levels: readonly Level[];
}

export const LAYOUT_CHARS = '.IKBX*GJF123456789';
