// Tour 2, Montecarlo: bombs, stone and two-layer ice, goals in pairs.
import type { Tour } from '../schema';

export const TOUR_2: Tour = {
  id: 'montecarlo',
  name: 'Montecarlo',
  theme: 'montecarlo',
  levels: [
    {
      id: 't2-01', name: 'Metxa curta', seed: 201,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['*...*', '..*..', '.....', '..*..', '*...*'] },
      goals: [{ type: 'bombs', count: 6 }], stars: [4500, 5500],
      intro: 'Les bombes rebenten el seu voltant. Fes-ne esclatar 6.',
    },
    {
      id: 't2-02', name: 'Gel doble', seed: 202,
      limit: { kind: 'moves', moves: 10 },
      board: { rows: 5, cols: 5, layout: ['K...K', '.K.K.', '..I..', '.K.K.', 'K...K'] },
      goals: [{ type: 'clear', obstacle: 'ice' }], stars: [9000, 14500],
      intro: 'Aquest gel té dues capes.',
    },
    {
      id: 't2-03', name: 'Pòquer d\'asos', seed: 203,
      limit: { kind: 'moves', moves: 22 }, board: { rows: 5, cols: 5 },
      deck: { jokersPerShoe: 6 },
      goals: [{ type: 'hand', hand: 'quads', count: 1 }], stars: [20500, 24000],
      intro: 'Fes un pòquer. Hi ha més comodins que mai.',
    },
    {
      id: 't2-04', name: 'El mur', seed: 204,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 6, cols: 5, layout: ['.....', 'X...X', 'XBXBX', '.....', '.....', '.....'] },
      goals: [{ type: 'clear', obstacle: 'block' }], stars: [2500, 3500],
      intro: 'Els blocs de pedra necessiten dos cops.',
    },
    {
      id: 't2-05', name: 'Ruleta', seed: 205,
      limit: { kind: 'time', ms: 80_000 }, board: { rows: 5, cols: 5 },
      goals: [{ type: 'hand', hand: 'flush', count: 4 }, { type: 'score', target: 15000 }], stars: [17000, 18000],
      intro: '4 colors i 15.000 punts abans que s\'acabi el temps.',
    },
    {
      id: 't2-06', name: 'Traca', seed: 206,
      limit: { kind: 'moves', moves: 10 },
      board: { rows: 5, cols: 5, layout: ['.....', '.*...', '.....', '...*.', '.....'] },
      deck: { bombChance: 0.1 },
      goals: [{ type: 'bombs', count: 6 }], stars: [5500, 9000],
      intro: 'No paren de sortir bombes. Fes-ne esclatar 6.',
    },
    {
      id: 't2-07', name: 'Escales de gel', seed: 207,
      limit: { kind: 'moves', moves: 10 },
      board: { rows: 5, cols: 5, layout: ['K...K', '.....', '.IKI.', '.....', 'K...K'] },
      goals: [{ type: 'clear', obstacle: 'ice' }, { type: 'handAtLeast', min: 'straight', count: 4 }], stars: [4500, 6000],
      intro: 'Desglaça-ho tot i fes 4 escales o millor.',
    },
    {
      id: 't2-08', name: 'Caixa forta', seed: 1212,
      limit: { kind: 'moves', moves: 22 },
      board: { rows: 5, cols: 5, layout: ['.G.G.', '.XXX.', '.XGX.', '.XXX.', '.....'] },
      goals: [{ type: 'clear', obstacle: 'block' }, { type: 'golden', count: 4 }], stars: [11000, 17500],
      intro: 'Obre la caixa forta i fes servir 4 cartes daurades.',
    },
    {
      id: 't2-09', name: 'Banca', seed: 209,
      limit: { kind: 'time', ms: 100_000 }, board: { rows: 5, cols: 5 },
      deck: { bombChance: 0.04 },
      goals: [{ type: 'score', target: 16000 }], stars: [19000, 22000],
      intro: '16.000 punts en 100 segons, amb bombes pel mig.',
    },
    {
      id: 't2-10', name: 'Contrarellotge', seed: 210, special: true,
      limit: { kind: 'time', ms: 120_000 },
      board: { rows: 6, cols: 5, layout: ['K...K', '.X.X.', '..K..', '..*..', '.X.X.', 'K...K'] },
      goals: [{ type: 'clear', obstacle: 'ice' }, { type: 'clear', obstacle: 'block' }, { type: 'score', target: 15000 }], stars: [20000, 27000],
      intro: 'Repte especial: gel, blocs i 15.000 punts en dos minuts.',
    },
  ],
};
