// Languages: the phone's language picks the game's, and every translation covers the whole Poker Tour.
import { describe, expect, it } from 'vitest';
import { TOURS } from '../../engine/tour/levels';
import { en } from '../i18n/en/tour';
import { es } from '../i18n/es/tour';
import { fromPhone } from '../i18n/lang';

describe('language', () => {
  it('takes the first of the phone’s languages that the game speaks', () => {
    expect(fromPhone(['ca-ES', 'es-ES'])).toBe('ca');
    expect(fromPhone(['es-ES', 'ca'])).toBe('es');
    expect(fromPhone(['fr-FR', 'en-GB'])).toBe('en');
    expect(fromPhone(['de-DE'])).toBeNull();
  });
});

describe('Poker Tour translations', () => {
  const ids = TOURS.flatMap((t) => t.levels.map((l) => l.id)).sort();
  const tours = TOURS.map((t) => t.id).sort();

  it.each([['es', es], ['en', en]] as const)('%s names every city and every level', (_, texts) => {
    expect(Object.keys(texts.tourNames).sort()).toEqual(tours);
    expect(Object.keys(texts.levels).sort()).toEqual(ids);
    for (const id of ids) {
      expect(texts.levels[id].name).not.toBe('');
      expect(texts.levels[id].intro).not.toBe('');
    }
  });
});
