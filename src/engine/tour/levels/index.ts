// Every tour, in play order. A new tour is a new file here. Level ids never change (progress is
// saved under them), so the order of tours doesn't follow their file numbers.
import type { Tour } from '../schema';
import { TOUR_1 } from './tour1';
import { TOUR_2 } from './tour2';
import { TOUR_3 } from './tour3';
import { TOUR_4 } from './tour4';
import { TOUR_5 } from './tour5';
import { TOUR_6 } from './tour6';

export const TOURS: readonly Tour[] = [TOUR_1, TOUR_2, TOUR_4, TOUR_5, TOUR_6, TOUR_3];
