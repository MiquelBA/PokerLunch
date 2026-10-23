// A level's game: its rules as a GameConfig variant, and its starting board (layout placed over a
// board dealt from a seed: the level's own, or a fresh one on every play so boards can't be learned).
import { mutableCopy } from '../board';
import { DEFAULT_CONFIG, makeConfig } from '../config';
import { countHands, newGame } from '../game';
import { parseCard } from '../notation';
import { HAND_TYPES, type Card, type Cell, type GameConfig, type GameState, type HandDef, type HandType, type Pos } from '../types';
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
    ...(level.board.gold ? { bonusCells: level.board.gold.map(parsePos) } : {}),
  });
}

/** 'row,col' → a position. */
export function parsePos(key: string): Pos {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
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
    case 'F': return { ...dealt, fog: true };
    default: return /[1-9]/.test(ch) ? { ...dealt, chain: Number(ch), bomb: undefined } : dealt;
  }
}

function clean(c: Card): Card {
  return Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined)) as unknown as Card;
}

/** The level's starting game: same seed, same board. The layout and fixed cards never change. */
export function newLevelGame(level: Level, seed = level.seed): GameState {
  const config = levelConfig(level);
  const dealt = newGame({ seed, config });
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
  return newGame({ seed: seed * 31 + 7, config, board });
}

/**
 * A fresh seed for one play of the level, so replays deal other cards around the same layout. Like
 * the validator, it wants a starting board with enough hands; if none turns up, the level's own.
 */
export function playSeed(level: Level, random: () => number = Math.random): number {
  const config = levelConfig(level);
  for (let i = 0; i < 20; i++) {
    const seed = Math.floor(random() * 2 ** 31);
    if (countHands(newLevelGame(level, seed).board, config, config.minValidMoves) >= config.minValidMoves) return seed;
  }
  return level.seed;
}
