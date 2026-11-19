// How long a timed game lasts: the smart bot plays at a steady pace (seconds of thinking per hand;
// the clock is stopped while a hand plays, as on screen) until the clock runs out.
// npm run sim:time -- [games]
import { DEFAULT_CONFIG } from '../engine/config';
import { applyMove, findHands, handPoints, newGame, pathCards, tick, type FoundHand } from '../engine/game';
import type { GameState } from '../engine/types';

const games = Number(process.argv[2] ?? 30);
const config = DEFAULT_CONFIG;
const worth = (s: GameState, h: FoundHand) => handPoints(h.hand, pathCards(s.board, h.path)!, config);

/** The best of the 25 best-looking hands, played for real (blasts, combo, variety bonus). */
function smart(s: GameState, hands: readonly FoundHand[]): FoundHand {
  let best = hands[0], bestPts = -1;
  for (const h of [...hands].sort((a, b) => worth(s, b) - worth(s, a)).slice(0, 25)) {
    const end = applyMove(s, { path: h.path, atMs: s.elapsedMs }).events.find((e) => e.type === 'moveEnd');
    const pts = end?.type === 'moveEnd' ? end.points : 0;
    if (pts > bestPts) { bestPts = pts; best = h; }
  }
  return best;
}

const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.round((ms % 60_000) / 1000)).padStart(2, '0')}`;

console.log(`${games} games per pace; the real players' average is about 10 s per hand`);
console.log('pace      hands   length (mean, shortest, longest)');
for (const secs of [14, 10, 8, 6, 4]) {
  let hands = 0, total = 0, min = Infinity, max = 0;
  for (let g = 0; g < games; g++) {
    let s = newGame({ seed: 5000 + g, config });
    for (;;) {
      s = tick(s, secs * 1000).state;
      if (s.gameOver) break;
      const found = findHands(s.board, config, Infinity, s.tokens);
      s = applyMove(s, { path: smart(s, found).path, atMs: s.elapsedMs }).state;
      hands++;
    }
    total += s.elapsedMs; min = Math.min(min, s.elapsedMs); max = Math.max(max, s.elapsedMs);
  }
  console.log(`${String(secs).padStart(2)} s/hand  ${(hands / games).toFixed(0).padStart(4)}    ${clock(total / games)}  ${clock(min)}  ${clock(max)}`);
}
