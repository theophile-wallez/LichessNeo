import { describe, expect, it } from 'vitest';
import { en } from '#page/review/i18n/en.ts';
import { fr } from '#page/review/i18n/fr.ts';
import { thinkingWords } from './markup.ts';

describe('the coach waiting for the engine', () => {
  it('says it the same way for a move, every time it shows', () => {
    expect(thinkingWords(en.ui.thinking, 12, 'abcdefgh')).toBe(
      thinkingWords(en.ui.thinking, 12, 'abcdefgh'),
    );
  });

  it('says it another way from one move to the next, every way in turn', () => {
    for (const ways of [en.ui.thinking, fr.ui.thinking]) {
      const said = Array.from({ length: ways.length }, (_, ply) =>
        thinkingWords(ways, ply + 1, 'abcdefgh'),
      );
      expect(new Set(said).size).toBe(ways.length);
    }
  });

  it('starts its turn somewhere else in another game', () => {
    const firsts = ['abcdefgh', 'CX7Bv9lg', 'tKlG0mrQ', ''].map(gameId =>
      thinkingWords(en.ui.thinking, 1, gameId),
    );
    expect(new Set(firsts).size).toBeGreaterThan(1);
  });
});
