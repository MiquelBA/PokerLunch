// Poker Tour texts (Catalan).
import type { Goal, Obstacle } from '../../engine/tour/schema';
import { HAND_NAMES } from '../strings';

const n = (v: number) => v.toLocaleString('ca');

export const TOUR_STRINGS = {
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
} as const;

const CLEAR_LABEL: Record<Obstacle, string> = { ice: 'Desglaça-ho tot', block: 'Trenca tots els blocs', fog: 'Aixeca tota la boira', chain: 'Trenca totes les cadenes' };
const CLEAR_SHORT: Record<Obstacle, string> = { ice: 'Gel', block: 'Blocs', fog: 'Boira', chain: 'Cadenes' };
const CLEAR_ICON: Record<Obstacle, string> = { ice: '❄️', block: '🧱', fog: '🌫️', chain: '⛓️' };

/** A goal in a few words, with its target. */
export function goalLabel(g: Goal): string {
  switch (g.type) {
    case 'score': return `${n(g.target)} punts`;
    case 'hand': return `${g.count} × ${HAND_NAMES[g.hand]}`;
    case 'handAtLeast': return `${g.count} × ${HAND_NAMES[g.min]} o millor`;
    case 'clear': return CLEAR_LABEL[g.obstacle];
    case 'bombs': return `${g.count} bombes`;
    case 'golden': return `${g.count} cartes daurades`;
    case 'squares': return `${g.count} mans per caselles daurades`;
  }
}

/** Short label for the in-game goals bar. */
export function goalShort(g: Goal): string {
  switch (g.type) {
    case 'score': return 'Punts';
    case 'hand': return HAND_NAMES[g.hand];
    case 'handAtLeast': return `${HAND_NAMES[g.min]}+`;
    case 'clear': return CLEAR_SHORT[g.obstacle];
    case 'bombs': return 'Bombes';
    case 'golden': return 'Daurades';
    case 'squares': return 'Caselles';
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
