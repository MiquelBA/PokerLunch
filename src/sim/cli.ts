// Simulator: how often each hand is on the board, and what two bots score: a greedy one (the hand worth
// most now) and a flush lover (a flush whenever it can, greedy otherwise).
// npm run sim -- [games] [movesPerGame]
import { makeConfig } from '../engine/config';
import { applyMove, findHands, handPoints, newGame, pathCards, type FoundHand } from '../engine/game';
import { HAND_TYPES, type GameState, type HandType } from '../engine/types';

const games = Number(process.argv[2] ?? 40);
const movesPerGame = Number(process.argv[3] ?? 40);
const config = makeConfig({ mode: 'moves', maxMoves: movesPerGame });

type Bot = (s: GameState, hands: readonly FoundHand[]) => FoundHand;
const worth = (s: GameState, h: FoundHand) => handPoints(h.hand, pathCards(s.board, h.path)!, config);
const greedy: Bot = (s, hands) => hands.reduce((a, b) => (worth(s, b) > worth(s, a) ? b : a));
/** Tries the 25 best-looking hands for real (blasts, combo, variety bonus) and plays the best. */
const smart: Bot = (s, hands) => {
  const top = [...hands].sort((a, b) => worth(s, b) - worth(s, a)).slice(0, 25);
  let best = top[0], bestPts = -1;
  for (const h of top) {
    const r = applyMove(s, { path: h.path });
    const end = r.events.find((e) => e.type === 'moveEnd');
    const pts = end?.type === 'moveEnd' ? end.points : 0;
    if (pts > bestPts) { bestPts = pts; best = h; }
  }
  return best;
};
const flushLover: Bot = (s, hands) => hands.find((h) => h.hand === 'flush') ?? greedy(s, hands);

function run(name: string, bot: Bot): void {
  const onBoard = Object.fromEntries(HAND_TYPES.map((h) => [h, 0])) as Record<HandType, number>;
  const made = { ...onBoard };
  let boards = 0, totalHands = 0, minHands = Infinity, score = 0, shuffles = 0, varieties = 0;
  for (let g = 0; g < games; g++) {
    let s = newGame({ seed: 1000 + g, config });
    while (!s.gameOver) {
      const hands = findHands(s.board, config, Infinity, s.tokens);
      boards++;
      totalHands += hands.length;
      minHands = Math.min(minHands, hands.length);
      for (const h of HAND_TYPES) if (hands.some((x) => x.hand === h)) onBoard[h]++;
      const best = bot(s, hands);
      made[best.hand]++;
      const r = applyMove(s, { path: best.path });
      if (r.events.some((e) => e.type === 'variety')) varieties++;
      s = r.state;
    }
    score += s.score;
    shuffles += s.shuffles;
  }
  const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;
  console.log(`\n${name}: ${games} games × ${movesPerGame} moves`);
  console.log(`playable hands on the board: mean ${(totalHands / boards).toFixed(0)}, min ${minHands}; shuffles per game ${(shuffles / games).toFixed(2)}; variety runs per game ${(varieties / games).toFixed(1)}`);
  console.log(`score per game: ${Math.round(score / games)}`);
  console.log('hand            playable   made (per game)');
  for (const h of HAND_TYPES) console.log(`${h.padEnd(15)} ${pct(onBoard[h], boards).padStart(8)}   ${(made[h] / games).toFixed(2)}`);
}

// run('greedy', greedy);
run('smart (sees the variety bonus)', smart);
run('flush lover', flushLover);
