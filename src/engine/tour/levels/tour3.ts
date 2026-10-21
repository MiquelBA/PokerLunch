// Tour 3, Las Vegas: the big hands, crowded boards and the royal finale.
import type { Tour } from '../schema';

export const TOUR_3: Tour = {
  id: 'vegas',
  name: 'Las Vegas',
  theme: 'vegas',
  levels: [
    {
      id: 't3-01', name: 'Escala de color', seed: 301,
      limit: { kind: 'moves', moves: 17 }, board: { rows: 5, cols: 5 },
      deck: { jokersPerShoe: 6 },
      goals: [{ type: 'handAtLeast', min: 'straightFlush', count: 1 }], stars: [15500, 25000],
      intro: 'Fes una escala de color (o millor).',
    },
    {
      id: 't3-02', name: 'Nevada', seed: 302,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['K.K.K', '.*.*.', 'K.K.K', '.....', 'K.K.K'] },
      goals: [{ type: 'clear', obstacle: 'ice' }], stars: [4500, 7000],
      intro: 'Gel gruixut. Les bombes t\'hi ajudaran.',
    },
    {
      id: 't3-03', name: 'Fulls a dojo', seed: 303,
      limit: { kind: 'time', ms: 45_000 }, board: { rows: 5, cols: 5 },
      goals: [{ type: 'handAtLeast', min: 'fullHouse', count: 5 }], stars: [5000, 6500],
      intro: '5 fulls o millor en 45 segons.',
    },
    {
      id: 't3-04', name: 'Demolició', seed: 304,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 6, cols: 5, layout: ['.....', '.*.*.', 'XXXXX', '.....', '.*.*.', '.....'] },
      goals: [{ type: 'clear', obstacle: 'block' }, { type: 'bombs', count: 4 }], stars: [8500, 12500],
      intro: 'Tomba el mur i fes esclatar 4 bombes.',
    },
    {
      id: 't3-05', name: 'Jackpot', seed: 305,
      limit: { kind: 'moves', moves: 19 }, board: { rows: 5, cols: 5 },
      deck: { goldenChance: 0.12 },
      goals: [{ type: 'score', target: 30000 }], stars: [32000, 36000],
      intro: 'Pluja d\'or: 30.000 punts en 15 jugades.',
    },
    {
      id: 't3-06', name: 'Doble pòquer', seed: 306,
      limit: { kind: 'moves', moves: 12 }, board: { rows: 5, cols: 5 },
      deck: { jokersPerShoe: 5 },
      goals: [{ type: 'handAtLeast', min: 'quads', count: 2 }], stars: [30000, 50000],
      intro: 'Fes 2 pòquers o millor.',
    },
    {
      id: 't3-07', name: 'Laberint', seed: 307,
      limit: { kind: 'moves', moves: 9 },
      board: { rows: 6, cols: 5, layout: ['K.X.K', '.X.X.', 'X.K.X', '.X.X.', 'K.X.K', '.....'] },
      goals: [{ type: 'clear', obstacle: 'ice' }, { type: 'clear', obstacle: 'block' }], stars: [4500, 5500],
      intro: 'Desglaça i trenca-ho tot.',
    },
    {
      id: 't3-08', name: 'Cara o creu', seed: 308,
      limit: { kind: 'time', ms: 75_000 }, board: { rows: 5, cols: 5 },
      deck: { jokersPerShoe: 5 },
      goals: [{ type: 'handAtLeast', min: 'quads', count: 2 }, { type: 'score', target: 25000 }], stars: [27000, 28500],
      intro: '2 pòquers i 25.000 punts.',
    },
    {
      id: 't3-09', name: 'All in', seed: 309,
      limit: { kind: 'moves', moves: 15 },
      board: { rows: 5, cols: 5, layout: ['.K.K.', 'K.*.K', '.*.*.', 'K.*.K', '.K.K.'] },
      deck: { jokersPerShoe: 5 },
      goals: [{ type: 'clear', obstacle: 'ice' }, { type: 'handAtLeast', min: 'quads', count: 2 }], stars: [16500, 26500],
      intro: 'Desglaça-ho tot i fes 2 pòquers.',
    },
    {
      id: 't3-10', name: 'Escala reial', seed: 310, special: true,
      limit: { kind: 'moves', moves: 8 },
      board: {
        rows: 5, cols: 5,
        layout: ['K...K', '.IIII', '..*.J', 'K...K', '*...*'],
        fixed: { '1,1': 'TH', '1,2': 'JH', '1,3': 'QH', '1,4': 'KH' },
      },
      deck: { jokersPerShoe: 4 },
      goals: [{ type: 'clear', obstacle: 'ice' }, { type: 'handAtLeast', min: 'straightFlush', count: 1 }], stars: [23000, 24500],
      intro: 'Repte final: allibera el 10, J, Q i K de cors i fes una escala de color.',
    },
  ],
};
