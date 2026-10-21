// Poker Tour texts (Catalan).
import type { Goal } from '../../engine/tour/schema';
import { HAND_NAMES } from '../strings';

const n = (v: number) => v.toLocaleString('ca');

export const TOUR_STRINGS = {
  title: 'Poker Tour',
  menuButton: 'Poker Tour',
  menuInfo: '30 nivells en 3 ciutats',
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
  unlockedTour: (name: string) => `Nou tour obert: ${name}`,
  rules: {
    ice: 'Carta glaçada: no es pot tocar. Fes mans al seu costat per desglaçar-la.',
    block: 'Bloc: atura les cartes. Es trenca fent mans al seu costat.',
    bomb: 'Bomba: quan la fas servir, rebenta les cartes del voltant.',
  },
} as const;

/** A goal in a few words, with its target. */
export function goalLabel(g: Goal): string {
  switch (g.type) {
    case 'score': return `${n(g.target)} punts`;
    case 'hand': return `${g.count} × ${HAND_NAMES[g.hand]}`;
    case 'handAtLeast': return `${g.count} × ${HAND_NAMES[g.min]} o millor`;
    case 'clear': return g.obstacle === 'ice' ? 'Desglaça-ho tot' : 'Trenca tots els blocs';
    case 'bombs': return `${g.count} bombes`;
    case 'golden': return `${g.count} cartes daurades`;
  }
}

/** Short label for the in-game goals bar. */
export function goalShort(g: Goal): string {
  switch (g.type) {
    case 'score': return 'Punts';
    case 'hand': return HAND_NAMES[g.hand];
    case 'handAtLeast': return `${HAND_NAMES[g.min]}+`;
    case 'clear': return g.obstacle === 'ice' ? 'Gel' : 'Blocs';
    case 'bombs': return 'Bombes';
    case 'golden': return 'Daurades';
  }
}

export function goalIcon(g: Goal): string {
  switch (g.type) {
    case 'score': return '🎯';
    case 'hand': case 'handAtLeast': return '🃏';
    case 'clear': return g.obstacle === 'ice' ? '❄️' : '🧱';
    case 'bombs': return '💣';
    case 'golden': return '⭐';
  }
}
