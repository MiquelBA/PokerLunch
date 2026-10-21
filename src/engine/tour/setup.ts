// A level's game: its rules as a GameConfig variant, and its starting board (layout placed over a
// board dealt from the level's seed).
import { mutableCopy } from '../board';
import { DEFAULT_CONFIG, makeConfig } from '../config';
import { newGame } from '../game';
import { parseCard } from '../notation';
import { HAND_TYPES, type Card, type Cell, type GameConfig, type GameState, type HandDef, type HandType } from '../types';
import type { Level } from './schema';

/** The Classic rules, changed only where the level says so. */
export function levelConfig(level: Level): GameConfig {
  const rules = level.rules ?? {};
  const hands = Object.fromEntries(HAND_TYPES.map((h): [HandType, HandDef] => {
    const def = DEFAULT_CONFIG.hands[h];
    if (rules.tokens) return [h, def];
    const { tokens: _tokens, ...rest } = def;
    return [h, rest];
  })) as Record<HandType, HandDef>;
  return makeConfig({
    rows: level.board.rows,
    cols: level.board.cols,
    hands,
    jokersPerShoe: level.deck?.jokersPerShoe ?? DEFAULT_CONFIG.jokersPerShoe,
    goldenChance: level.deck?.goldenChance ?? DEFAULT_CONFIG.goldenChance,
    bombChance: level.deck?.bombChance ?? 0,
    varietyLength: rules.variety === false ? 0 : DEFAULT_CONFIG.varietyLength,
    maxTimeBonusMs: rules.timeBonus ? DEFAULT_CONFIG.maxTimeBonusMs : 0,
    powerTimeMs: rules.timeBonus ? DEFAULT_CONFIG.powerTimeMs : 0,
    mode: level.limit.kind,
    durationMs: level.limit.kind === 'time' ? level.limit.ms : DEFAULT_CONFIG.durationMs,
    maxMoves: level.limit.kind === 'moves' ? level.limit.moves : DEFAULT_CONFIG.maxMoves,
  });
}

/** Turns a layout character into what the cell holds, given the card dealt there. */
function placed(ch: string, dealt: Card): Card {
  switch (ch) {
    case 'I': return { ...dealt, ice: 1, golden: undefined };
    case 'K': return { ...dealt, ice: 2, golden: undefined };
    case 'B': return { id: dealt.id, rank: 0, suit: 0, block: 1 };
    case 'X': return { id: dealt.id, rank: 0, suit: 0, block: 2 };
    case '*': return { ...dealt, bomb: true, joker: undefined };
    case 'G': return dealt.joker ? dealt : { ...dealt, golden: true };
    case 'J': return { id: dealt.id, rank: 0, suit: 0, joker: true };
    default: return dealt;
  }
}

function clean(c: Card): Card {
  return Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined)) as unknown as Card;
}

/** The level's starting game: same seed, same board, for everyone. */
export function newLevelGame(level: Level): GameState {
  const config = levelConfig(level);
  const dealt = newGame({ seed: level.seed, config });
  const board: Cell[][] = mutableCopy(dealt.board);
  board.forEach((row, r) => row.forEach((cell, c) => {
    let card = cell!;
    const fixed = level.board.fixed?.[`${r},${c}`];
    if (fixed) card = { ...parseCard(fixed), id: card.id };
    const ch = level.board.layout?.[r]?.[c] ?? '.';
    board[r][c] = clean(placed(ch, card));
  }));
  // Refills come from a second shoe, so the first new cards don't repeat the starting board. The
  // board is not reshuffled, so fixed cards stay put: the validator checks it has enough hands.
  return newGame({ seed: level.seed * 31 + 7, config, board });
}
