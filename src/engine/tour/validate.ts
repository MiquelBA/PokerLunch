// Checks a tour's levels before they ship: shapes, goals that can be met, stars that make sense,
// a starting board with hands to play. Returns readable problems (empty = fine).
import { DEFAULT_CONFIG } from '../config';
import { countHands } from '../game';
import { parseCard } from '../notation';
import { HAND_TYPES } from '../types';
import { obstaclesLeft } from './goals';
import { LAYOUT_CHARS, type Level, type Tour } from './schema';
import { levelConfig, newLevelGame } from './setup';

export function validateLevel(level: Level): string[] {
  const out: string[] = [];
  const at = (msg: string) => out.push(`${level.id}: ${msg}`);
  const { rows, cols, layout, fixed } = level.board;
  if (rows < 3 || rows > 7 || cols < 3 || cols > 7) at(`board ${rows}×${cols} out of range (3-7)`);
  if (layout) {
    if (layout.length !== rows) at(`layout has ${layout.length} rows, board ${rows}`);
    layout.forEach((line, r) => {
      if (line.length !== cols) at(`layout row ${r} has ${line.length} cells, board ${cols}`);
      for (const ch of line) if (!LAYOUT_CHARS.includes(ch)) at(`layout row ${r}: unknown '${ch}'`);
    });
  }
  for (const [key, card] of Object.entries(fixed ?? {})) {
    const [r, c] = key.split(',').map(Number);
    if (!(r >= 0 && r < rows && c >= 0 && c < cols)) at(`fixed ${key} is off the board`);
    try { parseCard(card); } catch { at(`fixed ${key}: bad card '${card}'`); }
    const ch = layout?.[r]?.[c];
    if (ch === 'B' || ch === 'X') at(`fixed ${key} is on a block`);
  }
  if (level.limit.kind === 'moves' && !(level.limit.moves >= 1)) at('needs at least 1 move');
  if (level.limit.kind === 'time' && !(level.limit.ms >= 10_000)) at('needs at least 10 s');
  if (!level.goals.length) at('has no goals');
  if (!(level.stars[0] < level.stars[1])) at('star scores must go up');
  const start = newLevelGame(level);
  for (const g of level.goals) {
    if ((g.type === 'hand' && !HAND_TYPES.includes(g.hand)) || (g.type === 'handAtLeast' && !HAND_TYPES.includes(g.min))) at('unknown hand in a goal');
    if (g.type === 'clear' && obstaclesLeft(start, g.obstacle) === 0) at(`goal clears ${g.obstacle} but the board has none`);
    if (g.type === 'bombs' && !level.board.layout?.some((l) => l.includes('*')) && !level.deck?.bombChance) at('goal needs bombs but none are dealt');
    if (g.type === 'golden' && level.deck?.goldenChance === 0 && !level.board.layout?.some((l) => l.includes('G'))) at('goal needs golden cards but none are dealt');
    if (g.type === 'score' && g.target > level.stars[0]) at('score goal above the 2-star score');
  }
  const config = levelConfig(level);
  if (countHands(start.board, config, DEFAULT_CONFIG.minValidMoves) < DEFAULT_CONFIG.minValidMoves) at('starting board has fewer than 3 hands: change the seed or the layout');
  return out;
}

export function validateTours(tours: readonly Tour[]): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  for (const t of tours) {
    for (const l of t.levels) {
      if (ids.has(l.id)) out.push(`${l.id}: duplicate id`);
      ids.add(l.id);
      out.push(...validateLevel(l));
    }
  }
  return out;
}
