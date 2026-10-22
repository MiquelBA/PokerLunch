// Tour 5, Macau: golden squares. A hand through one scores double.
import type { Tour } from '../schema';

export const TOUR_5: Tour = {
  id: 'macau',
  name: 'Macau',
  theme: 'macau',
  // Three tours passed (30) plus a second star on half of them.
  starsToOpen: 45,
  levels: [
    {
      id: 't5-01', name: 'Casella de la sort', seed: 501,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, gold: ['2,2'] },
      goals: [{ type: 'squares', count: 3 }], stars: [10000, 18000],
      intro: 'Les mans que passen per la casella daurada valen el doble. Fes-ne 3.',
    },
    {
      id: 't5-02', name: 'Drac daurat', seed: 502,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, gold: ['1,1', '1,3', '3,1', '3,3'] },
      goals: [{ type: 'squares', count: 4 }, { type: 'score', target: 6000 }], stars: [8000, 9000],
      intro: '4 mans per caselles daurades i 6.000 punts.',
    },
    {
      id: 't5-03', name: 'Flor de lotus', seed: 503,
      limit: { kind: 'moves', moves: 9 },
      board: { rows: 5, cols: 5, layout: ['G...G', '.....', '..G..', '.....', 'G...G'], gold: ['0,2', '2,0', '2,4', '4,2'] },
      deck: { goldenChance: 0.1 },
      goals: [{ type: 'golden', count: 6 }, { type: 'squares', count: 3 }], stars: [15000, 22000],
      intro: 'Cartes i caselles daurades: el doble del doble.',
    },
    {
      id: 't5-04', name: 'Vuit de la sort', seed: 504,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, gold: ['0,0', '0,4', '4,0', '4,4', '2,2'] },
      goals: [{ type: 'handAtLeast', min: 'fullHouse', count: 3 }, { type: 'squares', count: 2 }], stars: [8000, 9000],
      intro: 'Fes 3 fulls o millor, 2 d\'ells per l\'or.',
    },
    {
      id: 't5-05', name: 'Or glaçat', seed: 505,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['.K.K.', 'K...K', '.....', 'K...K', '.K.K.'], gold: ['1,2', '2,1', '2,3', '3,2'] },
      goals: [{ type: 'clear', obstacle: 'ice' }, { type: 'squares', count: 3 }], stars: [5000, 7000],
      intro: 'Gel de dues capes. Desglaça-ho i passa per l\'or.',
    },
    {
      id: 't5-06', name: 'Fortuna', seed: 506,
      limit: { kind: 'time', ms: 45_000 },
      board: { rows: 5, cols: 5, gold: ['1,1', '1,3', '3,1', '3,3', '2,2'] },
      goals: [{ type: 'score', target: 9000 }], stars: [10500, 16000],
      intro: 'Un minut per fer 9.000 punts. L\'or ajuda!',
    },
    {
      id: 't5-07', name: 'La pagoda', seed: 507,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 6, cols: 5, layout: ['X.X.X', '.B.B.', 'B...B', '.....', '.....', '.....'], gold: ['0,1', '0,3', '2,2'] },
      goals: [{ type: 'clear', obstacle: 'block' }, { type: 'squares', count: 4 }], stars: [6500, 11500],
      intro: 'Tomba la pagoda i fes 4 mans per l\'or.',
    },
    {
      id: 't5-08', name: 'Any nou', seed: 508,
      limit: { kind: 'moves', moves: 9 },
      board: { rows: 5, cols: 5, layout: ['*...*', '.....', '..*..', '.....', '*...*'], gold: ['1,1', '1,3', '3,1', '3,3'] },
      goals: [{ type: 'bombs', count: 5 }, { type: 'squares', count: 3 }], stars: [7500, 10500],
      intro: 'Petards per l\'any nou: 5 bombes i 3 mans per l\'or.',
    },
    {
      id: 't5-09', name: 'Jade', seed: 509,
      limit: { kind: 'moves', moves: 9 },
      board: { rows: 5, cols: 5, gold: ['0,2', '2,2', '4,2'] },
      goals: [{ type: 'handAtLeast', min: 'straight', count: 5 }, { type: 'squares', count: 4 }], stars: [25500, 29500],
      intro: '5 escales o millor, 4 d\'elles per l\'or.',
    },
    {
      id: 't5-10', name: 'Gran Lisboa', seed: 510, special: true,
      limit: { kind: 'moves', moves: 19 },
      board: {
        rows: 6, cols: 5,
        layout: ['K...K', '.....', '..*..', '..*..', '.....', 'K...K'],
        gold: ['0,2', '1,1', '1,3', '2,0', '2,4', '3,0', '3,4', '4,1', '4,3', '5,2'],
      },
      deck: { goldenChance: 0.08 },
      goals: [{ type: 'clear', obstacle: 'ice' }, { type: 'score', target: 20000 }], stars: [23500, 41000],
      intro: 'Repte de Macau: el casino més gran, envoltat d\'or. 20.000 punts.',
    },
  ],
};
