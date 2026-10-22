// What the effects canvas draws for each frame. The bigger the hand, the bigger the show: tier 0
// (two pair, trips) is a small burst; from the full house up each tier adds a layer (casino chips,
// beams, a colour wave and fireworks, confetti) up to the royal flush's rain of gold.
import type { Frame } from '../frames';
import { SUIT_COLORS, UI } from '../uiConfig';
import type { FxCanvas } from './fxCanvas';

const GOLD = '#FFD54A', WHITE = '#FFFFFF', PINK = '#FF4F9A', CYAN = '#5BE7FF', AMBER = '#FF9A3C';
const TIER_COLORS = [
  [GOLD, WHITE], [GOLD, CYAN, WHITE], [GOLD, AMBER, WHITE, PINK], [GOLD, PINK, CYAN, WHITE],
  [GOLD, CYAN, WHITE, PINK], [PINK, GOLD, CYAN, WHITE], [GOLD, WHITE, AMBER, PINK, CYAN],
];

export interface Place {
  readonly at: (p: { row: number; col: number }) => { x: number; y: number };
  /** Cell width in px. */
  readonly cell: number;
  readonly width: number;
  readonly height: number;
  readonly boardTop: number;
  readonly boardLeft: number;
  readonly boardWidth: number;
  readonly boardHeight: number;
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

function burst(fx: FxCanvas, x: number, y: number, o: { count: number; speed: number; size: number; colors: readonly string[]; lifeMs: number; shape?: 'dot' | 'spark'; gravity?: number; delayMs?: number }): void {
  for (let i = 0; i < o.count; i++) {
    const a = (i / o.count) * Math.PI * 2 + rnd(-0.3, 0.3);
    const v = o.speed * rnd(0.4, 1);
    fx.particle({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      size: o.size * rnd(0.6, 1.3), color: o.colors[i % o.colors.length], lifeMs: o.lifeMs * rnd(0.7, 1),
      drag: 0.05, gravity: o.gravity ?? 0, shape: o.shape ?? 'dot', delayMs: o.delayMs,
    });
  }
}

export function playFrame(fx: FxCanvas, frame: Frame, place: Place): void {
  const { cell, at } = place;
  const F = UI.fx;
  if (frame.rush?.index === 0) playRushStart(fx, place);
  if (frame.kind === 'collect' && frame.hand) {
    const { tier, centre, path } = frame.hand;
    const { x, y } = at(centre);
    const colors = TIER_COLORS[tier];
    const hit = frame.duration * 0.7;
    // A spark trail on each card as it lifts.
    for (const p of path) {
      const c = at(p);
      burst(fx, c.x, c.y, { count: 6 + tier * 2, speed: cell * 2, size: cell * 0.05, colors, lifeMs: 380, shape: 'spark' });
    }
    // The hit where the cards meet.
    burst(fx, x, y, { count: F.particles[tier], speed: cell * F.speed * (1 + tier * 0.25), size: cell * F.dotSize, colors, lifeMs: F.lifeMs + tier * 120, delayMs: hit, gravity: cell * 2 });
    fx.ring({ x, y, fromRadius: cell * 0.3, toRadius: cell * (1.6 + tier * 0.8), width: cell * 0.1, color: colors[0], lifeMs: F.ringLifeMs + tier * 80, delayMs: hit });
    if (tier >= 1) {
      burst(fx, x, y, { count: 16 + tier * 14, speed: cell * F.speed * 1.8, size: cell * 0.07, colors: [WHITE, GOLD], lifeMs: F.lifeMs, shape: 'spark', delayMs: hit });
      fx.ring({ x, y, fromRadius: cell * 0.2, toRadius: cell * (2.4 + tier), width: cell * 0.05, color: WHITE, lifeMs: F.ringLifeMs, delayMs: hit + 80 });
    }
    // The straight and the flush each get a show of their own.
    if (frame.hand.hand === 'straight') straightRun(fx, place, path, hit);
    if (frame.hand.hand === 'flush') {
      const real = frame.ghosts.find((g) => !g.card.joker);
      suitFountain(fx, place, x, y, real ? real.card.suit : 1, hit);
    }
    // Full house and up: a jackpot. Light rays and casino chips raining over the table.
    if (tier >= 2) {
      fx.rays({ x, y, count: 12 + tier * 2, length: cell * (3 + tier), color: colors[1], lifeMs: 900 + tier * 200, turnsPerSecond: 0.4 });
      burst(fx, x, y, { count: 40, speed: cell * F.speed * 0.9, size: cell * 0.12, colors, lifeMs: 1000, gravity: cell * 6, delayMs: hit });
      chipRain(fx, place, hit, 26 + (tier - 2) * 14);
    }
    // Quads and up: beams across the whole board through the hand, a triple shock ring.
    if (tier >= 3) {
      beams(fx, place, x, y, hit);
      [GOLD, PINK, CYAN].forEach((color, i) => fx.ring({ x, y, fromRadius: cell * 0.4, toRadius: cell * (6 - i), width: cell * (0.18 - i * 0.04), color, lifeMs: 800, delayMs: hit + i * 90 }));
      fx.rays({ x, y, count: 20, length: cell * 9, color: GOLD, lifeMs: 1300, turnsPerSecond: -0.25 });
    }
    // Straight flush and up: a wave in the suit's colour sweeps the screen, then fireworks.
    if (tier >= 4) {
      const real = frame.ghosts.find((g) => !g.card.joker);
      const color = real ? suitColor(real.card.suit) : CYAN;
      [color, WHITE, color, GOLD].forEach((c, i) => fx.ring({ x, y, fromRadius: cell * 0.5, toRadius: cell * (14 - i * 2), width: cell * (0.5 - i * 0.08), color: c, lifeMs: 900, delayMs: hit + i * 120 }));
      fireworks(fx, place, hit + 250, tier >= 5 ? 9 : 5);
    }
    // Five of a kind and up: confetti over everything.
    if (tier >= 5) confetti(fx, place, hit, tier >= 6 ? 160 : 110);
    if (tier >= 6) goldRain(fx, place, hit);
  } else if (frame.kind === 'blast' && frame.blast) {
    const o = at(frame.blast.origin);
    const kind = frame.blast.kind;
    if (kind === 'cross' || kind === 'row') {
      // Beams along the row (and the column, for a cross).
      const dirs = kind === 'row' ? [[1, 0], [-1, 0]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of dirs) {
        for (let i = 0; i < 22; i++) {
          fx.particle({ x: o.x, y: o.y, vx: dx * cell * rnd(8, 16), vy: dy * cell * rnd(8, 16) + rnd(-20, 20), size: cell * rnd(0.05, 0.1), color: i % 2 ? GOLD : WHITE, lifeMs: 520, drag: 0.2, shape: 'spark' });
        }
      }
    }
    for (const g of frame.ghosts) {
      const c = at(g.from);
      const color = g.card.joker ? PINK : suitColor(g.card.suit);
      burst(fx, c.x, c.y, { count: 10, speed: cell * 4, size: cell * 0.08, colors: [color, GOLD], lifeMs: 520, delayMs: g.index * 18 });
      fx.ring({ x: c.x, y: c.y, fromRadius: cell * 0.1, toRadius: cell * 0.9, width: cell * 0.06, color: GOLD, lifeMs: 420, delayMs: g.index * 18 });
    }
    if (kind === 'bomb') fireball(fx, place, o.x, o.y);
    if (kind === 'storm') {
      // A storm of colour: rings in the suit's colour wash over the board.
      const color = frame.ghosts[0] ? suitColor(frame.ghosts[0].card.suit) : CYAN;
      [color, WHITE, color].forEach((c, i) => fx.ring({ x: o.x, y: o.y, fromRadius: cell * 0.3, toRadius: cell * (8 - i), width: cell * 0.16, color: c, lifeMs: 700, delayMs: i * 110 }));
      fx.rays({ x: o.x, y: o.y, count: 16, length: cell * 7, color, lifeMs: 900, turnsPerSecond: 0.5 });
    }
    fx.ring({ x: o.x, y: o.y, fromRadius: cell * 0.3, toRadius: cell * (kind === 'board' ? 9 : 5), width: cell * 0.2, color: WHITE, lifeMs: 640 });
    if (kind === 'board') goldRain(fx, place, 0);
  } else if (frame.kind === 'crack' && frame.damage) {
    for (const d of frame.damage) {
      const c = at(d.pos);
      if (d.obstacle === 'ice') iceShards(fx, cell, c.x, c.y, d.broken);
      else if (d.obstacle === 'fog') mistPuff(fx, cell, c.x, c.y);
      else if (d.obstacle === 'chain') chainLinks(fx, cell, c.x, c.y);
      else splinters(fx, cell, c.x, c.y, d.broken);
    }
  } else if (frame.kind === 'shuffle') {
    fx.ring({ x: place.boardLeft + place.boardWidth / 2, y: place.boardTop + place.boardHeight / 2, fromRadius: cell * 4, toRadius: cell * 0.5, width: cell * 0.1, color: CYAN, lifeMs: 500 });
  }
}

/** Poker Tour: the first bomb of the Rush sweeps the board with a neon ring. */
function playRushStart(fx: FxCanvas, place: Place): void {
  const x = place.boardLeft + place.boardWidth / 2, y = place.boardTop + place.boardHeight / 2;
  [PINK, CYAN, GOLD].forEach((color, i) => fx.ring({ x, y, fromRadius: place.cell * 0.5, toRadius: place.cell * (7 - i), width: place.cell * 0.22, color, lifeMs: 800, delayMs: i * 120 }));
  fx.rays({ x, y, count: 18, length: place.cell * 8, color: PINK, lifeMs: 1100, turnsPerSecond: 0.6 });
}

const ICE = ['#E6F7FF', '#9EE0FF', WHITE, '#5BC8FF'];

/** Ice cracking: glassy shards and a cold flash; thawed for good, a bigger burst. */
function iceShards(fx: FxCanvas, cell: number, x: number, y: number, broken: boolean): void {
  const n = broken ? 26 : 12;
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), v = cell * rnd(1.5, broken ? 5 : 3);
    fx.particle({ x: x + rnd(-cell * 0.3, cell * 0.3), y: y + rnd(-cell * 0.4, cell * 0.4), vx: Math.cos(a) * v, vy: Math.sin(a) * v - cell * 1.5, size: cell * rnd(0.06, 0.14), color: ICE[i % ICE.length], lifeMs: rnd(600, 900), gravity: cell * 8, drag: 0.3, shape: 'confetti' });
  }
  burst(fx, x, y, { count: 10, speed: cell * 3, size: cell * 0.05, colors: [WHITE, '#9EE0FF'], lifeMs: 380, shape: 'spark' });
  fx.ring({ x, y, fromRadius: cell * 0.2, toRadius: cell * (broken ? 1.3 : 0.8), width: cell * 0.07, color: '#BDEBFF', lifeMs: 380 });
}

/** Fog lifting: soft grey puffs drift up and away, and a flash as the card turns over. */
function mistPuff(fx: FxCanvas, cell: number, x: number, y: number): void {
  for (let i = 0; i < 14; i++) {
    fx.particle({ x: x + rnd(-cell * 0.35, cell * 0.35), y: y + rnd(-cell * 0.4, cell * 0.4), vx: rnd(-cell * 1.2, cell * 1.2), vy: -cell * rnd(0.6, 1.8), size: cell * rnd(0.2, 0.36), color: 'rgba(225, 232, 244, 0.55)', lifeMs: rnd(700, 1100), drag: 0.9 });
  }
  burst(fx, x, y, { count: 8, speed: cell * 2.5, size: cell * 0.05, colors: [WHITE], lifeMs: 360, shape: 'spark' });
}

/** A chain breaking: links fly off, metallic sparks. */
function chainLinks(fx: FxCanvas, cell: number, x: number, y: number): void {
  const colors = ['#C9CDD6', '#8A909C', WHITE];
  for (let i = 0; i < 12; i++) {
    const a = rnd(-Math.PI, 0), v = cell * rnd(2, 4.5);
    fx.particle({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: cell * rnd(0.07, 0.12), color: colors[i % colors.length], lifeMs: rnd(600, 900), gravity: cell * 10, drag: 0.2, shape: 'confetti' });
  }
  burst(fx, x, y, { count: 14, speed: cell * 4, size: cell * 0.05, colors: [WHITE, GOLD], lifeMs: 420, shape: 'spark' });
}

/** A block taking a hit: splinters and chips; broken, it bursts. */
function splinters(fx: FxCanvas, cell: number, x: number, y: number, broken: boolean): void {
  const colors = ['#6B4423', '#4A2E17', '#8A5A2E', '#D0182C'];
  for (let i = 0; i < (broken ? 22 : 10); i++) {
    const a = rnd(-Math.PI, 0), v = cell * rnd(2, broken ? 5.5 : 3.5);
    fx.particle({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: cell * rnd(0.06, 0.13), color: colors[i % colors.length], lifeMs: rnd(600, 950), gravity: cell * 10, drag: 0.2, shape: 'confetti' });
  }
  if (broken) {
    for (let i = 0; i < 8; i++) {
      fx.particle({ x, y, vx: rnd(-cell * 2.5, cell * 2.5), vy: -cell * rnd(2.5, 5), size: cell * rnd(0.14, 0.2), color: CHIP_COLORS[i % CHIP_COLORS.length], lifeMs: rnd(900, 1300), gravity: cell * 10, drag: 0.3, shape: 'chip' });
    }
    fx.ring({ x, y, fromRadius: cell * 0.2, toRadius: cell * 1.2, width: cell * 0.08, color: GOLD, lifeMs: 400 });
  }
}

/** A bomb going off: a fireball, embers and a puff of smoke. */
function fireball(fx: FxCanvas, place: Place, x: number, y: number): void {
  const cell = place.cell;
  const FIRE = ['#FFF3B0', GOLD, AMBER, '#FF4A1C'];
  burst(fx, x, y, { count: 46, speed: cell * 5, size: cell * 0.12, colors: FIRE, lifeMs: 620, gravity: cell * 1.5 });
  burst(fx, x, y, { count: 24, speed: cell * 7, size: cell * 0.06, colors: [WHITE, GOLD], lifeMs: 520, shape: 'spark' });
  for (let i = 0; i < 14; i++) {
    fx.particle({ x: x + rnd(-cell * 0.5, cell * 0.5), y: y + rnd(-cell * 0.5, cell * 0.5), vx: rnd(-cell, cell), vy: -cell * rnd(0.6, 1.6), size: cell * rnd(0.22, 0.38), color: 'rgba(60, 60, 70, 0.55)', lifeMs: rnd(800, 1200), drag: 0.8, delayMs: 120 });
  }
  [GOLD, AMBER, '#FF4A1C'].forEach((color, i) => fx.ring({ x, y, fromRadius: cell * 0.2, toRadius: cell * (2.2 - i * 0.4), width: cell * (0.3 - i * 0.07), color, lifeMs: 460, delayMs: i * 60 }));
  fx.rays({ x, y, count: 12, length: cell * 2.4, color: AMBER, lifeMs: 520, turnsPerSecond: 0.3 });
}

/** A suit's colour on the dark felt (spades are drawn white). */
function suitColor(suit: number): string {
  return suit === 0 ? WHITE : SUIT_COLORS[suit];
}

const SUIT_GLYPHS = ['♠', '♥', '♦', '♣'];

/**
 * The straight: a light runs card to card along the trace, like a marquee, then a streak of light
 * sweeps the whole width of the board through the hand.
 */
function straightRun(fx: FxCanvas, place: Place, path: readonly { row: number; col: number }[], hit: number): void {
  const cell = place.cell;
  const step = Math.min(90, (hit * 0.9) / Math.max(1, path.length));
  path.forEach((p, i) => {
    const c = place.at(p);
    const delayMs = i * step;
    fx.ring({ x: c.x, y: c.y, fromRadius: cell * 0.2, toRadius: cell * 0.85, width: cell * 0.09, color: i % 2 ? CYAN : WHITE, lifeMs: 380, delayMs });
    burst(fx, c.x, c.y, { count: 10, speed: cell * 3, size: cell * 0.06, colors: [CYAN, WHITE], lifeMs: 360, shape: 'spark', delayMs });
    const next = path[i + 1];
    if (!next) return;
    // A comet from this card to the next.
    const n = place.at(next);
    for (let k = 0; k < 6; k++) {
      fx.particle({ x: c.x, y: c.y, vx: ((n.x - c.x) / step) * 1000 * (0.8 + k * 0.05), vy: ((n.y - c.y) / step) * 1000 * (0.8 + k * 0.05), size: cell * (0.12 - k * 0.012), color: k ? CYAN : WHITE, lifeMs: step * 1.2, delayMs: delayMs + k * 8, shape: 'spark' });
    }
  });
  // The sweep: streaks shooting left to right across the board.
  const y = place.at(path[path.length - 1]).y;
  for (let i = 0; i < 26; i++) {
    fx.particle({
      x: place.boardLeft - cell, y: y + rnd(-cell * 1.2, cell * 1.2), vx: cell * rnd(16, 30), vy: 0,
      size: cell * rnd(0.05, 0.12), color: [WHITE, CYAN, GOLD][i % 3], lifeMs: 620, delayMs: hit + rnd(0, 140), shape: 'spark',
    });
  }
  fx.ring({ x: place.at(path[path.length - 1]).x, y, fromRadius: cell * 0.3, toRadius: cell * 3.6, width: cell * 0.12, color: CYAN, lifeMs: 620, delayMs: hit });
}

/**
 * The flush: a fountain of the suit's symbol bursts out of the hand and falls back over the board,
 * with a double ring in the suit's colour.
 */
function suitFountain(fx: FxCanvas, place: Place, x: number, y: number, suit: number, hit: number): void {
  const cell = place.cell;
  const color = suitColor(suit);
  const glyph = SUIT_GLYPHS[suit];
  for (let i = 0; i < 22; i++) {
    const a = -Math.PI / 2 + rnd(-1.3, 1.3);
    const v = cell * rnd(3, 5.5);
    fx.particle({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, size: cell * rnd(0.16, 0.3), color: i % 4 ? color : GOLD,
      lifeMs: rnd(1100, 1500), gravity: cell * 9, drag: 0.6, delayMs: hit + rnd(0, 160), shape: 'glyph', glyph,
    });
  }
  [color, GOLD].forEach((c, i) => fx.ring({ x, y, fromRadius: cell * 0.3, toRadius: cell * (4 - i), width: cell * 0.14, color: c, lifeMs: 700, delayMs: hit + i * 110 }));
  fx.rays({ x, y, count: 10, length: cell * 2.2, color: GOLD, lifeMs: 700, turnsPerSecond: 0.35 });
}

const CHIP_COLORS = ['#D0182C', '#1D5FD6', '#13883F', '#16181D', '#FFC93C', '#7A3BD8'];

/** Casino chips tumbling down over the board. */
function chipRain(fx: FxCanvas, place: Place, delayMs: number, count: number): void {
  for (let i = 0; i < count; i++) {
    fx.particle({
      x: rnd(place.boardLeft - place.cell, place.boardLeft + place.boardWidth + place.cell), y: rnd(-place.cell * 3, place.boardTop),
      vx: rnd(-50, 50), vy: rnd(80, 280), size: place.cell * rnd(0.14, 0.22), color: CHIP_COLORS[i % CHIP_COLORS.length],
      lifeMs: rnd(1300, 2000), gravity: place.cell * 9, drag: 0.7, delayMs: delayMs + rnd(0, 500), shape: 'chip',
    });
  }
}

/** Light beams along the row and the column of a point, the full width and height of the board. */
function beams(fx: FxCanvas, place: Place, x: number, y: number, delayMs: number): void {
  const cell = place.cell;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let i = 0; i < 30; i++) {
      fx.particle({ x, y, vx: dx * cell * rnd(10, 22), vy: dy * cell * rnd(10, 22) + rnd(-15, 15), size: cell * rnd(0.06, 0.13), color: i % 3 ? GOLD : WHITE, lifeMs: 650, drag: 0.25, shape: 'spark', delayMs });
    }
  }
}

/** Firework shells bursting at random points over and around the board. */
function fireworks(fx: FxCanvas, place: Place, delayMs: number, shells: number): void {
  const palette = [[GOLD, WHITE], [PINK, WHITE], [CYAN, WHITE], [AMBER, GOLD], ['#7CFF6B', WHITE]];
  for (let i = 0; i < shells; i++) {
    const x = rnd(place.boardLeft, place.boardLeft + place.boardWidth);
    const y = rnd(place.boardTop - place.cell, place.boardTop + place.boardHeight * 0.7);
    const colors = palette[i % palette.length];
    const at = delayMs + i * 170 + rnd(0, 80);
    burst(fx, x, y, { count: 34, speed: place.cell * 5.5, size: place.cell * 0.07, colors, lifeMs: 1000, gravity: place.cell * 3, shape: 'spark', delayMs: at });
    fx.ring({ x, y, fromRadius: place.cell * 0.1, toRadius: place.cell * 1.6, width: place.cell * 0.05, color: colors[0], lifeMs: 500, delayMs: at });
  }
}

/** Paper confetti drifting down over the whole screen. */
function confetti(fx: FxCanvas, place: Place, delayMs: number, count: number): void {
  const colors = [GOLD, PINK, CYAN, WHITE, AMBER, '#7CFF6B', '#7A3BD8'];
  for (let i = 0; i < count; i++) {
    fx.particle({
      x: rnd(0, place.width), y: rnd(-place.cell * 3, place.boardTop * 0.8), vx: rnd(-60, 60), vy: rnd(40, 180),
      size: place.cell * rnd(0.07, 0.12), color: colors[i % colors.length], lifeMs: rnd(1800, 2800), gravity: place.cell * 3, drag: 0.5,
      delayMs: delayMs + rnd(0, 900), shape: 'confetti',
    });
  }
}

/** Gold coins and confetti falling over the whole board. */
function goldRain(fx: FxCanvas, place: Place, delayMs: number): void {
  const colors = [GOLD, GOLD, WHITE, AMBER, PINK, CYAN];
  for (let i = 0; i < 140; i++) {
    fx.particle({
      x: rnd(0, place.width), y: rnd(-place.cell * 2, place.boardTop), vx: rnd(-40, 40), vy: rnd(60, 260),
      size: place.cell * rnd(0.05, 0.13), color: colors[i % colors.length], lifeMs: rnd(1400, 2200), gravity: place.cell * 7, drag: 0.6,
      delayMs: delayMs + rnd(0, 700), shape: i % 3 ? 'dot' : 'spark',
    });
  }
}

/**
 * The Poker Tour champion, over the whole screen: `wave` 0 is the big bang (rays, rings, chips and
 * gold), later waves keep the fireworks and confetti going.
 */
export function playChampion(fx: FxCanvas, width: number, height: number, wave: number): void {
  const cell = Math.min(width, height) / 7;
  const place: Place = { at: () => ({ x: width / 2, y: height / 2 }), cell, width, height, boardTop: height * 0.15, boardLeft: 0, boardWidth: width, boardHeight: height * 0.55 };
  const x = width / 2, y = height * 0.36;
  if (wave === 0) {
    [WHITE, GOLD, AMBER, PINK].forEach((color, i) => fx.ring({ x, y, fromRadius: cell * 0.4, toRadius: cell * (9 - i * 1.5), width: cell * 0.3, color, lifeMs: 900, delayMs: i * 110 }));
    fx.rays({ x, y, count: 24, length: cell * 9, color: GOLD, lifeMs: 1600, turnsPerSecond: 0.35 });
    burst(fx, x, y, { count: 90, speed: cell * 9, size: cell * 0.09, colors: [GOLD, WHITE, AMBER], lifeMs: 1200, gravity: cell * 3, shape: 'spark' });
    chipRain(fx, place, 200, 40);
    goldRain(fx, place, 300);
  }
  fireworks(fx, place, wave === 0 ? 400 : 0, 6);
  confetti(fx, place, 0, wave === 0 ? 120 : 50);
}
