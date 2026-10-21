// Presentation values (timings, sizes, colours). Gameplay values live in src/engine/config.ts.
import type { HandType } from '../engine/types';

/**
 * How loud a hand is on screen: 0 small (two pair, trips), 1 (straight, flush), then one tier per big
 * hand, each a bigger show: 2 full house (jackpot), 3 quads, 4 straight flush, 5 five of a kind,
 * 6 royal flush (takes over the screen).
 */
export const HAND_TIER: Readonly<Record<HandType, number>> = {
  twoPair: 0,
  trips: 0,
  straight: 1,
  flush: 1,
  fullHouse: 2,
  quads: 3,
  straightFlush: 4,
  fiveKind: 5,
  royalFlush: 6,
};

/** The tier from which the score rolls up like a slot machine and the hand takes the whole screen. */
export const BIG_TIER = 2;
export const ROYAL_TIER = 6;

export const SUIT_COLORS = ['#15171C', '#E0263A', '#1C6BE0', '#0E9A48'] as const;
export const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'] as const;

export const UI = {
  /** Cells are taller than wide, so cards look like cards. */
  cellAspect: 1.36,
  /** A cell is marked only when the finger is within this fraction of the cell from its centre. */
  hitRadius: 0.4,
  countdown: { steps: 3, stepMs: 700, goMs: 650 },
  hintDelayMs: 20_000,
  /** Until the player has made this many hands, a finger traces the hint. */
  guideHands: 3,
  guideDelayMs: 20_000,
  /**
   * Animation of a move, by hand tier: the cards gather and burst (collect), the blast, the fall.
   * The clock stops meanwhile, so big hands can take their time.
   */
  anim: {
    collect: [360, 440, 1000, 1250, 1500, 1800, 2200] as readonly number[],
    blast: 560,
    fall: 340,
    shuffle: 520,
    /** New game: one card dealt every dealStep ms, each falling for dealCard ms. */
    dealStep: 38,
    dealCard: 420,
    /** Turning the cards over at "Som-hi!": a wave from the top-left corner. */
    flip: 460,
    flipStep: 45,
    shake: 280,
    floatText: 900,
    banner: [700, 1000, 1900, 2200, 2500, 2900, 3400] as readonly number[],
  },
  clockWarningMs: 10_000,
  warningTickMs: 5000,
  soundKey: 'poker-lunch:sound',
  bestKey: 'poker-lunch:best',
  daily: { timeZone: 'Europe/Madrid', key: 'poker-lunch:daily' },
  helpSeenKey: 'poker-lunch:help-seen',
  guideKey: 'poker-lunch:guide-hands',
  varietyTipKey: 'poker-lunch:variety-tip',
  varietyTipMs: 4000,
  haptics: {
    step: [10],
    hand: [40],
    big: [80, 40, 120],
    huge: [140, 50, 140, 50, 300],
    invalid: [25, 40, 25],
    count: [25],
    go: [100],
    gameOver: [240, 120, 380],
  } as Record<string, number[]>,
  /** Screen shake (px) and board punch by hand tier. */
  shakePx: [0, 2, 7, 13, 17, 21, 24] as readonly number[],
  punch: [0.01, 0.02, 0.04, 0.055, 0.065, 0.075, 0.09] as readonly number[],
  /** Whole-screen flash (opacity) by hand tier. */
  flash: [0.04, 0.12, 0.4, 0.55, 0.65, 0.75, 0.85] as readonly number[],
  fx: {
    spillPx: 260,
    /** Particles by hand tier. */
    particles: [16, 28, 60, 90, 110, 140, 170] as readonly number[],
    dotSize: 0.09,
    speed: 6,
    lifeMs: 700,
    ringLifeMs: 560,
  },
  /** Comb text (index = combo count − 2; last one repeats). */
  comboTextKeys: ['comboHot', 'comboFire', 'comboBoom'] as const,
  sound: { runStepMs: 55 },
  countUpMs: 700,
  /** The HUD score rolling up: longer for bigger wins; from bigPoints it glows. */
  roll: { minMs: 250, msPerPoint: 0.12, maxMs: 2200, bigPoints: 800 },
} as const;
