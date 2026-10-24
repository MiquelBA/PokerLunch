// Poker Tour texts. The Catalan original is here; Spanish and English are in ../i18n/, with the same shape.
import { TOURS } from '../../engine/tour/levels';
import type { Goal, Level, Obstacle, Tour } from '../../engine/tour/schema';
import { en } from '../i18n/en/tour';
import { es } from '../i18n/es/tour';
import { fmt as n, pick } from '../i18n/lang';
import { HAND_NAMES } from '../strings';

const TOUR_STRINGS_CA = {
  title: 'Poker Tour',
  menuButton: 'Poker Tour',
  menuInfo: '60 nivells en 6 ciutats',
  menuProgress: (level: number, stars: number, of: number) => `Nivell ${level} · ${stars}/${of} ★`,
  back: 'Torna',
  stars: (k: number, of: number) => `${k}/${of} ★`,
  locked: 'Supera el nivell anterior per obrir-lo',
  level: (i: number) => `Nivell ${i}`,
  special: 'Repte especial',
  goals: 'Objectius',
  moves: (k: number) => `${k} jugades`,
  time: (s: number) => `${s} segons`,
  movesLeft: 'jugades',
  starScores: (a: number, b: number) => `★★ ${n(a)} · ★★★ ${n(b)}`,
  best: (v: number) => `El teu millor: ${n(v)}`,
  play: 'Juga',
  won: 'Nivell superat!',
  lost: 'Gairebé!',
  lostHint: 'Torna-ho a provar: els intents són il·limitats.',
  rush: 'Poker Rush',
  rushStart: 'POKER RUSH!',
  rushPoints: (p: number) => `Poker Rush +${n(p)}`,
  next: 'Següent nivell',
  retry: 'Torna-ho a provar',
  replay: 'Repeteix',
  map: 'Mapa',
  tourDone: 'Tour completat!',
  city: (n: number) => `Ciutat ${n}`,
  newCity: (name: string) => `Rumb a ${name}!`,
  championGoal: 'Supera les 6 ciutats per ser Campió del Poker Tour',
  championSee: 'Campió del Poker Tour! Mira el teu trofeu',
  champion: 'Campió del Poker Tour',
  /** On the shared picture, above a big "POKER TOUR". */
  championImageKicker: 'CAMPIÓ DEL',
  championClaim: 'Recull el trofeu!',
  championKicker: 'Enhorabona!',
  championLine: (levels: number, cities: number) => `${levels} nivells · ${cities} ciutats`,
  championStars: (k: number, of: number) => `${k} de ${of} estrelles`,
  championShare: 'Comparteix-ho',
  championShareText: (stars: number) => `Soc Campió del Poker Tour de Poker Lunch amb ${stars} ★! T'hi atreveixes?`,
  championBack: 'Torna al mapa',
  championMore: (k: number) => `Encara pots aconseguir ${k} ★ més repetint nivells.`,
  unlockedTour: (name: string) => `Nou tour obert: ${name}`,
  needStars: (name: string, k: number) => `Aconsegueix ${k} ★ més per obrir ${name}. Repeteix nivells per millorar-ne les estrelles!`,
  tourLocked: (k: number, have: number) => `Necessites ${k} ★ per obrir-lo (en tens ${have})`,
  rules: {
    ice: 'Carta glaçada: no es pot tocar. Fes mans al seu costat per desglaçar-la.',
    block: 'Bloc: atura les cartes. Es trenca fent mans al seu costat.',
    bomb: 'Bomba: quan la fas servir, rebenta les cartes del voltant.',
    fog: 'Boira: la carta està girada. Fes mans al seu costat per descobrir-la.',
    gold: 'Casella daurada: la mà que hi passi per sobre val el doble.',
    chain: 'Cadena: les cartes encadenades només es poden fer servir totes juntes. Una mà al costat trenca la cadena.',
  },
  /** The level's goals, in a few words. */
  goal: {
    score: (target: number) => `${n(target)} punts`,
    handAtLeast: (count: number, hand: string) => `${count} × ${hand} o millor`,
    bombs: (count: number) => `${count} bombes`,
    golden: (count: number) => `${count} cartes daurades`,
    squares: (count: number) => `${count} mans per caselles daurades`,
    clear: { ice: 'Desglaça-ho tot', block: 'Trenca tots els blocs', fog: 'Aixeca tota la boira', chain: 'Trenca totes les cadenes' } as Record<Obstacle, string>,
  },
  /** The same, shorter, for the in-game goals bar. */
  goalShort: {
    score: 'Punts',
    bombs: 'Bombes',
    golden: 'Daurades',
    squares: 'Caselles',
    clear: { ice: 'Gel', block: 'Blocs', fog: 'Boira', chain: 'Cadenes' } as Record<Obstacle, string>,
  },
  /** The cities (by tour id) and each level's name and intro (by level id). In Catalan they come from the levels. */
  tourNames: Object.fromEntries(TOURS.map((t) => [t.id, t.name])) as Record<string, string>,
  levels: Object.fromEntries(TOURS.flatMap((t) => t.levels.map((l) => [l.id, { name: l.name, intro: l.intro ?? '' }]))) as Record<string, { name: string; intro: string }>,
};

/** The shape every language fills in. */
export type TourTexts = typeof TOUR_STRINGS_CA;

export const TOUR_STRINGS = pick<TourTexts>({ ca: TOUR_STRINGS_CA, es, en });
const T = TOUR_STRINGS;

export const tourName = (t: Tour): string => T.tourNames[t.id] ?? t.name;
export const levelName = (l: Level): string => T.levels[l.id]?.name ?? l.name;
export const levelIntro = (l: Level): string => T.levels[l.id]?.intro ?? l.intro ?? '';

const CLEAR_ICON: Record<Obstacle, string> = { ice: '❄️', block: '🧱', fog: '🌫️', chain: '⛓️' };

/** A goal in a few words, with its target. */
export function goalLabel(g: Goal): string {
  switch (g.type) {
    case 'score': return T.goal.score(g.target);
    case 'hand': return `${g.count} × ${HAND_NAMES[g.hand]}`;
    case 'handAtLeast': return T.goal.handAtLeast(g.count, HAND_NAMES[g.min]);
    case 'clear': return T.goal.clear[g.obstacle];
    case 'bombs': return T.goal.bombs(g.count);
    case 'golden': return T.goal.golden(g.count);
    case 'squares': return T.goal.squares(g.count);
  }
}

/** Short label for the in-game goals bar. */
export function goalShort(g: Goal): string {
  switch (g.type) {
    case 'score': return T.goalShort.score;
    case 'hand': return HAND_NAMES[g.hand];
    case 'handAtLeast': return `${HAND_NAMES[g.min]}+`;
    case 'clear': return T.goalShort.clear[g.obstacle];
    case 'bombs': return T.goalShort.bombs;
    case 'golden': return T.goalShort.golden;
    case 'squares': return T.goalShort.squares;
  }
}

export function goalIcon(g: Goal): string {
  switch (g.type) {
    case 'score': return '🎯';
    case 'hand': case 'handAtLeast': return '🃏';
    case 'clear': return CLEAR_ICON[g.obstacle];
    case 'bombs': return '💣';
    case 'golden': return '⭐';
    case 'squares': return '🟨';
  }
}
