// Every tour, in play order. A new tour is a new file here.
import type { Tour } from '../schema';
import { TOUR_1 } from './tour1';
import { TOUR_2 } from './tour2';
import { TOUR_3 } from './tour3';

export const TOURS: readonly Tour[] = [TOUR_1, TOUR_2, TOUR_3];
