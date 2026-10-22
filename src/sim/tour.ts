// Poker Tour calibration: plays every level many times with a goal-minded bot (with a little
// randomness, so runs differ) and reports how often it wins, the moves it needs and its scores.
// Star scores are set from these numbers: 2★ near the median win, 3★ near the best 15%.
// npm run sim:tour -- [runs] [levelIdFilter]
import { areNeighbours, cellAt } from '../engine/board';
import { findHands, handPoints, pathCards, type FoundHand } from '../engine/game';
import { handStrength } from '../engine/hands';
import { nextRandom } from '../engine/rng';
import { TOURS } from '../engine/tour/levels';
import { playRun, progress, startRun, tickRun, type TourRun } from '../engine/tour/run';
import type { Level } from '../engine/tour/schema';

const runs = Number(process.argv[2] ?? 40);
const filter = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '';
/** A person takes a few seconds to find a hand; timed levels are tuned for that pace. */
const THINK_MS = 4500;

function value(run: TourRun, h: FoundHand): number {
  const s = run.game;
  const cards = pathCards(s.board, h.path)!;
  let v = handPoints(h.hand, cards, s.config);
  for (const p of progress(run)) {
    if (p.done) continue;
    const g = p.goal;
    if (g.type === 'hand' && g.hand === h.hand) v += 4000;
    if (g.type === 'handAtLeast' && handStrength(h.hand) >= handStrength(g.min)) v += 4000;
    if (g.type === 'bombs') v += 2500 * cards.filter((c) => c.bomb).length;
    if (g.type === 'golden') v += 2500 * cards.filter((c) => c.golden).length;
    if (g.type === 'clear') {
      for (let r = 0; r < s.board.length; r++) for (let c = 0; c < s.board[0].length; c++) {
        const x = cellAt(s.board, { row: r, col: c });
        if (x?.[g.obstacle] && h.path.some((q) => areNeighbours(q, { row: r, col: c }))) v += 2000;
      }
      if (g.obstacle === 'chain') v += 2000 * cards.filter((c) => c.chain).length;
    }
    if (g.type === 'squares' && s.config.bonusCells?.some((b) => h.path.some((q) => q.row === b.row && q.col === b.col))) v += 3000;
  }
  return v;
}

function playLevel(level: Level, salt: number) {
  let run = startRun(level);
  let rng = (salt * 2654435761) >>> 0;
  while (run.status === 'playing') {
    if (run.game.config.mode === 'time') {
      run = tickRun(run, THINK_MS).run;
      if (run.status !== 'playing') break;
    }
    const hands = findHands(run.game.board, run.game.config, 80, run.game.tokens);
    if (!hands.length) break;
    const ranked = hands.map((h) => ({ h, v: value(run, h) })).sort((a, b) => b.v - a.v);
    let r: number;
    [r, rng] = nextRandom(rng);
    const pick = ranked[Math.min(ranked.length - 1, r < 0.6 ? 0 : r < 0.85 ? 1 : 2)].h;
    run = playRun(run, { path: pick.path, atMs: run.game.elapsedMs }).run;
  }
  return run;
}

const pct = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(p * xs.length))] : 0);
const k = (n: number) => `${Math.round(n / 100) / 10}k`;

if (!process.argv.includes('--tune')) {
console.log('level   win%  used(med)  score p50  p85   stars now        →  suggest');
for (const tour of TOURS) {
  for (const level of tour.levels) {
    if (filter && !level.id.includes(filter)) continue;
    const results = Array.from({ length: runs }, (_, i) => playLevel(level, i + 1));
    const wins = results.filter((r) => r.status === 'won');
    const scores = wins.map((r) => r.game.score);
    const used = wins.map((r) => (r.game.config.mode === 'moves' ? r.game.moves : Math.round(r.game.elapsedMs / 1000)));
    const s2 = Math.round(pct(scores, 0.5) / 500) * 500, s3 = Math.round(pct(scores, 0.85) / 500) * 500;
    const limit = level.limit.kind === 'moves' ? `${level.limit.moves}m` : `${level.limit.ms / 1000}s`;
    console.log(`${level.id.padEnd(7)} ${String(Math.round((wins.length / runs) * 100)).padStart(4)}%  ${String(pct(used, 0.5)).padStart(4)}/${limit.padEnd(4)}  ${k(pct(scores, 0.5)).padStart(8)} ${k(pct(scores, 0.85)).padStart(6)}   ${k(level.stars[0])}/${k(level.stars[1])}`.padEnd(66) + `→ [${s2}, ${s3}]`);
  }
}
}

// --tune: suggests limits (the bot's median × a factor that shrinks tour by tour) and star scores
// (30th and 70th percentile of the bot's wins with that limit), as JSON to paste into the levels.
if (process.argv.includes('--tune')) {
  // The bot sees every hand on the board; people pick worse ones, so they get more moves than it needs.
  const FACTOR: Record<string, number> = { barcelona: 2.5, montecarlo: 2.0, london: 1.9, macau: 1.85, atlantic: 1.8, vegas: 1.7 };
  const MIN_MOVES: Record<string, number> = { barcelona: 8, montecarlo: 8, london: 8, macau: 8, atlantic: 8, vegas: 8 };
  const out: Record<string, unknown> = {};
  for (const tour of TOURS) {
    for (const level of tour.levels) {
      if (filter && !level.id.includes(filter)) continue;
      const first = Array.from({ length: runs }, (_, i) => playLevel(level, i + 1)).filter((r) => r.status === 'won');
      const med = pct(first.map((r) => (r.game.config.mode === 'moves' ? r.game.moves : r.game.elapsedMs)), 0.5);
      const f = FACTOR[tour.theme];
      const limit = level.limit.kind === 'moves'
        ? { kind: 'moves' as const, moves: Math.max(MIN_MOVES[tour.theme], Math.round(med * f)) }
        : { kind: 'time' as const, ms: Math.max(45_000, Math.round((med * f) / 5000) * 5000) };
      const tuned: Level = { ...level, limit };
      const second = Array.from({ length: runs }, (_, i) => playLevel(tuned, i + 1));
      const wins = second.filter((r) => r.status === 'won').map((r) => r.game.score);
      const scoreGoal = Math.max(0, ...level.goals.map((g) => (g.type === 'score' ? g.target : 0)));
      const s2 = Math.max(scoreGoal + 500, Math.round(pct(wins, 0.3) / 500) * 500);
      const s3 = Math.max(s2 + 1000, Math.round(pct(wins, 0.7) / 500) * 500);
      out[level.id] = { limit, stars: [s2, s3], win: Math.round((wins.length / runs) * 100) };
    }
  }
  console.log(JSON.stringify(out));
}
