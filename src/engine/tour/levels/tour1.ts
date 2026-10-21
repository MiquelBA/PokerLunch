// Tour 1, Barcelona: the basics, one idea per level. Star scores come from `npm run sim:tour`.
import type { Tour } from '../schema';

export const TOUR_1: Tour = {
  id: 'barcelona',
  name: 'Barcelona',
  theme: 'barcelona',
  levels: [
    {
      id: 't1-01', name: 'Primera mà', seed: 101,
      limit: { kind: 'moves', moves: 8 }, board: { rows: 5, cols: 5 },
      goals: [{ type: 'score', target: 4000 }], stars: [5500, 9000],
      intro: 'Fes 4.000 punts en 8 jugades.',
    },
    {
      id: 't1-02', name: 'Doble parella', seed: 102,
      limit: { kind: 'moves', moves: 10 }, board: { rows: 5, cols: 5 },
      goals: [{ type: 'hand', hand: 'twoPair', count: 4 }], stars: [2000, 3000],
      intro: 'Fes 4 dobles parelles.',
    },
    {
      id: 't1-03', name: 'Color de casa', seed: 103,
      limit: { kind: 'moves', moves: 8 }, board: { rows: 5, cols: 5 },
      goals: [{ type: 'hand', hand: 'flush', count: 3 }], stars: [3000, 4000],
      intro: 'Fes 3 colors: 5 cartes del mateix pal.',
    },
    {
      id: 't1-04', name: 'Primeres glaçades', seed: 104,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['I...I', '..I..', 'I...I', '..I..', 'I...I'] },
      goals: [{ type: 'clear', obstacle: 'ice' }], stars: [2500, 3500],
      intro: 'Les cartes glaçades no es poden tocar. Fes mans al seu costat per desglaçar-les.',
    },
    {
      id: 't1-05', name: 'Escala amunt', seed: 105,
      limit: { kind: 'moves', moves: 18 }, board: { rows: 5, cols: 5 },
      goals: [{ type: 'hand', hand: 'straight', count: 3 }, { type: 'score', target: 5000 }], stars: [8000, 9500],
      intro: 'Fes 3 escales i arriba a 5.000 punts.',
    },
    {
      id: 't1-06', name: 'Or de la casa', seed: 106,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['G...G', '.....', '..G..', '.....', 'G...G'] },
      goals: [{ type: 'golden', count: 5 }], stars: [16500, 18000],
      intro: 'Les cartes daurades doblen els punts. Fes-ne servir 5.',
    },
    {
      id: 't1-07', name: 'Fitxes al mig', seed: 107,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['.....', 'B.B.B', '.....', 'B.B.B', '.....'] },
      goals: [{ type: 'clear', obstacle: 'block' }], stars: [2500, 3500],
      intro: 'Els blocs aturen les cartes. Trenca\'ls fent mans al seu costat.',
    },
    {
      id: 't1-08', name: 'Contrarellotge', seed: 108,
      limit: { kind: 'time', ms: 90_000 }, board: { rows: 5, cols: 5 },
      goals: [{ type: 'score', target: 10000 }], stars: [14000, 18000],
      intro: '10.000 punts en minut i mig. El temps que sobri es converteix en bombes!',
    },
    {
      id: 't1-09', name: 'Full de luxe', seed: 109,
      limit: { kind: 'moves', moves: 8 }, board: { rows: 5, cols: 5 },
      goals: [{ type: 'handAtLeast', min: 'fullHouse', count: 3 }], stars: [5000, 8000],
      intro: 'Fes 3 fulls o millor.',
    },
    {
      id: 't1-10', name: 'Tot o res', seed: 1111, special: true,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['I.I.I', '.I.I.', 'I.K.I', '.I.I.', 'I.I.I'] },
      goals: [{ type: 'clear', obstacle: 'ice' }], stars: [3000, 4000],
      intro: 'Repte especial: desglaça tot el tauler.',
    },
  ],
};
