import { afterEach, describe, expect, it } from 'vitest';
import { MOVE_CLASSES } from '#page/review/classes/classes.ts';
import { en } from './en.ts';
import { fr } from './fr.ts';
import { pageLanguage } from './language.ts';
import type { ReviewLanguage } from './types.ts';
// The original script's strings, per language.
import legacy from './fixtures/legacy.json' with { type: 'json' };

const LANGUAGES: readonly (readonly ['en' | 'fr', ReviewLanguage])[] = [
  ['en', en],
  ['fr', fr],
];

const EXPLAINED = {
  en: ['Best was 12. [[m:w:Nf3]] [[m:b:Qd7]].', '[[m:w:Bg5]] allows 12. [[m:w:Nf3]] [[m:b:Qd7]].'],
  fr: [
    'La meilleure suite était 12. [[m:w:Nf3]] [[m:b:Qd7]].',
    '[[m:w:Bg5]] permet 12. [[m:w:Nf3]] [[m:b:Qd7]].',
  ],
};

const COUNT_TIPS = {
  en: ['Black’s blunders: 2', 'White’s inaccuracies: 1'],
  fr: ['Gaffes des Noirs\u00a0: 2', 'Imprécisions des Blancs\u00a0: 1'],
};

describe.each(LANGUAGES)('%s', (lang, language) => {
  const original = legacy[lang];

  it('has the original’s interface strings', () => {
    const { T } = original;
    // Explain's lines, the summary's profile, the graph's views, the share button, the cost
    // bars, Retry, the tactics' tags, the clock's advice, the brief and the closed review's
    // way back to the summary are new: the original had none. Its phase and player labels
    // went with its table, and the free board's first words are a title over a line now.
    const {
      bestWas,
      liveIntro: _liveIntro,
      lines: _lines,
      playedLike: _playedLike,
      moves: _moves,
      profileTitle: _profileTitle,
      profile: _profile,
      graphViews: _graphViews,
      share: _share,
      cost: _cost,
      retry: _retry,
      themes: _themes,
      clock: _clock,
      brief: _brief,
      summary: _summary,
      ...ui
    } = language.ui;
    const {
      phases: _phases,
      players: _players,
      bestWas: originalBestWas,
      liveIntro: _originalLiveIntro,
      ...originalUi
    } = T;
    expect(ui).toEqual(originalUi);
    expect(bestWas('[[m:w:Nf3]]')).toBe(originalBestWas.replace('{m}', '[[m:w:Nf3]]'));
  });

  it('writes Explain’s lines around their moves', () => {
    const line = '12. [[m:w:Nf3]] [[m:b:Qd7]]';
    const written = language.ui.lines;
    expect([written.best(line), written.allows('[[m:w:Bg5]]', line)]).toEqual(EXPLAINED[lang]);
  });

  it('names each player’s count of a class', () => {
    expect([
      language.countTip('black', 'blunder', 2),
      language.countTip('white', 'inaccuracy', 1),
    ]).toEqual(COUNT_TIPS[lang]);
  });

  it('has the original’s class labels and verdicts', () => {
    expect(original.labels).toEqual(
      MOVE_CLASSES.map(moveClass => [
        moveClass,
        language.classLabels[moveClass],
        language.classSentences[moveClass],
      ]),
    );
  });

  it('has the original’s remarks, and its own for a side’s first book move', () => {
    const { firstMove, ...remarks } = language.remarks;
    expect(remarks).toEqual(original.remarks);
    expect(firstMove).toHaveLength(4);
  });
});

describe('typography', () => {
  it('keeps French punctuation with its word', () => {
    expect(fr.typography('Bien joué ! Et : ça ?')).toBe('Bien joué\u00a0! Et\u00a0: ça\u00a0?');
    expect(en.typography('Well played !')).toBe('Well played !');
  });
});

describe('pageLanguage', () => {
  afterEach(() => {
    document.documentElement.lang = '';
  });

  it('follows the page’s language', () => {
    document.documentElement.lang = 'fr-FR';
    expect(pageLanguage()).toBe(fr);
    document.documentElement.lang = 'de';
    expect(pageLanguage()).toBe(en);
  });
});
