// Tour 4, Londres: fog. Face-down cards that a hand next to them turns over.
import type { Tour } from '../schema';

export const TOUR_4: Tour = {
  id: 'london',
  name: 'Londres',
  theme: 'london',
  // Barcelona and Montecarlo passed (20) plus a second star on about half the levels.
  starsToOpen: 30,
  levels: [
    {
      id: 't4-01', name: 'Boira matinal', seed: 401,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['FFFFF', 'F...F', 'F...F', '.....', '.....'] },
      goals: [{ type: 'clear', obstacle: 'fog' }], stars: [3000, 4000],
      intro: 'Cartes girades per la boira. Fes mans al seu costat per descobrir-les.',
    },
    {
      id: 't4-02', name: 'Big Ben', seed: 402,
      limit: { kind: 'moves', moves: 13 },
      board: { rows: 5, cols: 5, layout: ['FFFFF', 'FFFFF', '.....', '.....', '.....'] },
      goals: [{ type: 'clear', obstacle: 'fog' }, { type: 'score', target: 8000 }], stars: [10000, 11500],
      intro: 'Aixeca la boira de dalt i fes 8.000 punts.',
    },
    {
      id: 't4-03', name: 'Té de les cinc', seed: 403,
      limit: { kind: 'moves', moves: 13 },
      board: { rows: 5, cols: 5, layout: ['F.F.F', '.F.F.', 'F.F.F', '.....', '.....'] },
      goals: [{ type: 'hand', hand: 'trips', count: 5 }], stars: [4000, 5500],
      intro: 'Fes 5 trios entre la boira.',
    },
    {
      id: 't4-04', name: 'Boira espessa', seed: 2404,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 6, cols: 5, layout: ['F.F.F', '.F.F.', 'F.F.F', '.F.F.', 'F.F.F', '.F.F.'] },
      goals: [{ type: 'clear', obstacle: 'fog' }], stars: [3500, 4500],
      intro: 'No es veu res! Descobreix totes les cartes.',
    },
    {
      id: 't4-05', name: 'El Tàmesi', seed: 18405,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['F...F', '.K.K.', 'K...K', '.K.K.', 'F...F'] },
      goals: [{ type: 'clear', obstacle: 'ice' }, { type: 'clear', obstacle: 'fog' }], stars: [4500, 6000],
      intro: 'El riu s\'ha glaçat (dues capes!) i hi ha boira a les dues ribes.',
    },
    {
      id: 't4-06', name: 'Piccadilly', seed: 1406,
      limit: { kind: 'time', ms: 60_000 },
      board: { rows: 5, cols: 5, layout: ['F.F.F', '.F.F.', 'F.F.F', '.F.F.', 'F.F.F'] },
      goals: [{ type: 'score', target: 6000 }], stars: [8000, 9000],
      intro: 'Pressa a la ciutat: 6.000 punts en un minut.',
    },
    {
      id: 't4-07', name: 'Torre de Londres', seed: 407,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 6, cols: 5, layout: ['F...F', 'F...F', 'XBXBX', '.....', '.....', 'F...F'] },
      goals: [{ type: 'clear', obstacle: 'block' }, { type: 'clear', obstacle: 'fog' }], stars: [3500, 4500],
      intro: 'Enderroca la muralla i aixeca la boira de la torre.',
    },
    {
      id: 't4-08', name: 'Scotland Yard', seed: 2408,
      limit: { kind: 'moves', moves: 10 },
      board: { rows: 5, cols: 5, layout: ['FFFFF', 'F...F', 'F...F', 'F...F', 'FFFFF'] },
      goals: [{ type: 'handAtLeast', min: 'flush', count: 5 }], stars: [11000, 13500],
      intro: 'Investiga entre la boira: 5 colors o millor.',
    },
    {
      id: 't4-09', name: 'Soho', seed: 409,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['F*..F', '.....', 'F.*.F', '.....', 'F..*F'] },
      goals: [{ type: 'bombs', count: 3 }, { type: 'clear', obstacle: 'fog' }], stars: [4000, 5000],
      intro: 'Fes esclatar les 3 bombes: també aixequen la boira.',
    },
    {
      id: 't4-10', name: 'Les joies de la Corona', seed: 410, special: true,
      limit: { kind: 'moves', moves: 8 },
      board: {
        rows: 5, cols: 5,
        layout: ['F...F', '.....', '..J..', '.....', 'F...F'],
        fixed: { '0,0': 'QS', '0,4': 'QH', '4,0': 'QD', '4,4': 'QC' },
      },
      goals: [{ type: 'clear', obstacle: 'fog' }, { type: 'handAtLeast', min: 'quads', count: 1 }], stars: [7000, 12500],
      intro: 'Repte de Londres: les quatre reines s\'amaguen a les cantonades. Descobreix-les i fes un pòquer.',
    },
  ],
};
