import { describe, expect, it } from 'vitest';
import { EN_IDEAS } from '#page/review/i18n/en-ideas.ts';
import { FR_IDEAS } from '#page/review/i18n/fr-ideas.ts';
import { IDEA_SIDES } from './idea-sides.ts';
import { ideaOf } from './ideas.ts';
import { OPENINGS } from './openings.ts';

describe('ideaOf', () => {
  it('gives the opening’s own idea, with the side whose plan it is', () => {
    expect(ideaOf(EN_IDEAS, 'Italian Game: Two Knights Defense')).toEqual({
      text: EN_IDEAS['Italian Game: Two Knights Defense'],
      side: 'black',
    });
  });

  it('gives its family’s for a variation without one', () => {
    expect(ideaOf(FR_IDEAS, 'Italian Game: Rousseau Gambit')).toEqual({
      text: FR_IDEAS['Italian Game'],
      side: 'white',
    });
  });

  it('gives none for an opening it doesn’t know, nor for an idea with no side', () => {
    expect(ideaOf(EN_IDEAS, 'Amar Opening')).toBeNull();
    expect(ideaOf(EN_IDEAS, '')).toBeNull();
    expect(ideaOf({ 'Amar Opening': 'Play Nh3.' }, 'Amar Opening')).toBeNull();
  });
});

describe('the ideas', () => {
  it('have a side and words in both languages for each opening', () => {
    const sides = Object.keys(IDEA_SIDES).toSorted();
    expect(Object.keys(EN_IDEAS).toSorted()).toEqual(sides);
    expect(Object.keys(FR_IDEAS).toSorted()).toEqual(sides);
    const empty = [EN_IDEAS, FR_IDEAS].flatMap(ideas =>
      Object.entries(ideas).filter(([, text]) => text.trim() === ''),
    );
    expect(empty).toEqual([]);
  });

  it('cover every opening the page offers, its own or its family’s', () => {
    const missing = OPENINGS.filter(opening => !ideaOf(EN_IDEAS, opening.name)).map(
      opening => opening.name,
    );
    expect(missing).toEqual([]);
  });
});
