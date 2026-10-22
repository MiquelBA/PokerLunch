// Tour 6, Atlantic City: chains. Chained cards play together, or a hand next to them breaks them.
import type { Tour } from '../schema';

export const TOUR_6: Tour = {
  id: 'atlantic',
  name: 'Atlantic City',
  theme: 'atlantic',
  // Four tours passed (40) plus a second star on half of them.
  starsToOpen: 60,
  levels: [
    {
      id: 't6-01', name: 'Encadenats', seed: 1601,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['11...', '.....', '..22.', '.....', '...33'] },
      goals: [{ type: 'clear', obstacle: 'chain' }], stars: [2500, 3500],
      intro: 'Les cartes encadenades van juntes. Fes una mà amb totes o una mà al costat per trencar la cadena.',
    },
    {
      id: 't6-02', name: 'Passeig marítim', seed: 1602,
      limit: { kind: 'moves', moves: 11 },
      board: { rows: 5, cols: 5, layout: ['.....', '111..', '.....', '..222', '.....'] },
      goals: [{ type: 'clear', obstacle: 'chain' }, { type: 'score', target: 10000 }], stars: [11500, 14000],
      intro: 'Cadenes de tres al passeig. Trenca-les i fes 10.000 punts.',
    },
    {
      id: 't6-03', name: 'Cadenes i gel', seed: 1603,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['1K.K2', '1...2', '..K..', '3...4', '3K.K4'] },
      goals: [{ type: 'clear', obstacle: 'chain' }, { type: 'clear', obstacle: 'ice' }], stars: [4000, 5000],
      intro: 'Trenca les cadenes de les cantonades i desglaça el centre.',
    },
    {
      id: 't6-04', name: 'Monopoly', seed: 604,
      limit: { kind: 'moves', moves: 14 },
      board: { rows: 5, cols: 5, layout: ['1...2', '.....', '..33.', '.....', '2...1'] },
      goals: [{ type: 'score', target: 10000 }], stars: [11500, 13500],
      intro: '10.000 punts. Les cadenes llargues travessen el tauler.',
    },
    {
      id: 't6-05', name: 'Ferro colat', seed: 1605,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 6, cols: 5, layout: ['1X.X2', '1...2', '.B.B.', '3...4', '3X.X4', '.....'] },
      goals: [{ type: 'clear', obstacle: 'chain' }, { type: 'clear', obstacle: 'block' }], stars: [3500, 4500],
      intro: 'Cadenes i blocs: trenca-ho tot.',
    },
    {
      id: 't6-06', name: 'Trilers', seed: 606,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['F1.2F', '.1.2.', 'F...F', '.3.4.', 'F3.4F'] },
      goals: [{ type: 'clear', obstacle: 'fog' }, { type: 'clear', obstacle: 'chain' }], stars: [3000, 4000],
      intro: 'On és la carta? Aixeca la boira i trenca les quatre cadenes.',
    },
    {
      id: 't6-07', name: 'Daus d\'or', seed: 607,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['.....', '.1.2.', '.1.2.', '.....', '.....'], gold: ['0,0', '0,4', '4,0', '4,4'] },
      goals: [{ type: 'clear', obstacle: 'chain' }, { type: 'squares', count: 3 }], stars: [7500, 8500],
      intro: 'Cadenes sobre els daus i or a les cantonades.',
    },
    {
      id: 't6-08', name: 'Doble cadena', seed: 608,
      limit: { kind: 'moves', moves: 8 },
      board: { rows: 5, cols: 5, layout: ['1111.', '.....', '.....', '.....', '.2222'] },
      deck: { jokersPerShoe: 4 },
      goals: [{ type: 'clear', obstacle: 'chain' }, { type: 'handAtLeast', min: 'fullHouse', count: 3 }], stars: [4000, 5000],
      intro: 'Dues cadenes de quatre. I 3 fulls o millor.',
    },
    {
      id: 't6-09', name: 'Mil llums', seed: 609,
      limit: { kind: 'time', ms: 45_000 },
      board: { rows: 5, cols: 5, layout: ['1...2', '1...2', '..3..', '4.3.5', '4...5'] },
      goals: [{ type: 'clear', obstacle: 'chain' }], stars: [2500, 3500],
      intro: 'Contra rellotge: trenca les cinc cadenes.',
    },
    {
      id: 't6-10', name: 'El gran casino', seed: 610, special: true,
      limit: { kind: 'moves', moves: 8 },
      board: {
        rows: 6, cols: 5,
        layout: ['1F.F2', '1...2', '.K*K.', '.....', '3...4', '3F.F4'],
        gold: ['3,2', '0,2', '5,2'],
      },
      goals: [{ type: 'clear', obstacle: 'chain' }, { type: 'clear', obstacle: 'fog' }, { type: 'clear', obstacle: 'ice' }, { type: 'squares', count: 2 }],
      stars: [6000, 7500],
      intro: 'Repte d\'Atlantic City: cadenes, boira, gel i or. Tot alhora!',
    },
  ],
};
