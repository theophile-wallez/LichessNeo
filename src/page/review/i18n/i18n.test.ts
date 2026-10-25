import { afterEach, describe, expect, it } from 'vitest';
import { MOVE_CLASSES } from '#page/review/classes/classes.ts';
import { en, english } from './en.ts';
import { fr, french } from './fr.ts';
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

const CASHED_IN = { en: 'Cashing in. Well spotted.', fr: 'Du matériel encaissé. Bien vu.' };

const COUNT_TIPS = {
  en: ['Black’s blunders: 2', 'White’s inaccuracies: 1'],
  fr: ['Gaffes des Noirs\u00a0: 2', 'Imprécisions des Blancs\u00a0: 1'],
};

describe.each(LANGUAGES)('%s', (lang, language) => {
  const original = legacy[lang];

  it('has the original’s interface strings', () => {
    const { T } = original;
    // Explain's lines, the summary's profile, the graph's views, the share button, the cost
    // bars, Retry, the tactics' tags, the clock's advice, the brief, the summary's tab and its
    // button to resume the debrief are new: the original had none, and its close button went
    // with the header the tabs replaced. Its phases are named for
    // what they hold now, each with a tip; its player labels went with its table, its game
    // rating's title and tip with its card, and the free board's first words are a title
    // over a line now. Its rating's tooltip as on Chess.com is new too.
    const {
      bestWas,
      liveIntro: _liveIntro,
      lines: _lines,
      playedLike: _playedLike,
      lichessRating: _lichessRating,
      moves: _moves,
      phasesTitle: _phasesTitle,
      phases: ourPhases,
      profileTitle: _profileTitle,
      profile: _profile,
      graphViews: _graphViews,
      share: _share,
      cost: _cost,
      retry: _retry,
      practice: _practice,
      themes: _themes,
      clock: _clock,
      brief: _brief,
      summary: _summary,
      resume: _resume,
      thinking,
      ...ui
    } = language.ui;
    const {
      phases: _phases,
      players: _players,
      gameRating: _gameRating,
      gameRatingTip: _gameRatingTip,
      bestWas: originalBestWas,
      liveIntro: _originalLiveIntro,
      thinking: originalThinking,
      close: _close,
      ...originalUi
    } = T;
    expect(ui).toEqual(originalUi);
    // The coach waits in other words too, the original's first.
    expect(thinking[0]).toBe(originalThinking);
    expect([ourPhases.opening.name, ourPhases.endgame.name]).toEqual([T.phases.o, T.phases.e]);
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

  it('has the original’s remarks first, and its own where it says something else', () => {
    // A capture may be a trade, so not "cashing in"; a winning or a lost position gets advice.
    const { firstMove, defending, winning, capture, ...remarks } = language.remarks('white');
    const { winning: _winning, capture: originalCapture, ...rest } = original.remarks;
    const originals: Readonly<Record<string, readonly string[]>> = rest;
    const firstOnes = Object.entries(remarks).map(([situation, pool]) => [
      situation,
      pool.slice(0, originals[situation]?.length),
    ]);
    expect(Object.fromEntries(firstOnes)).toEqual(originals);
    expect(capture).not.toContain(CASHED_IN[lang]);
    expect(capture).toEqual(
      expect.arrayContaining(originalCapture.filter(said => said !== CASHED_IN[lang])),
    );
    expect([firstMove, winning, defending].map(pool => pool.length)).toEqual([4, 5, 5]);
  });
});

describe('the remarks', () => {
  it('speak of the opponent’s moves in words of their own, and of every move alike when watching', () => {
    for (const language of [english, french]) {
      const reader = language('white');
      expect(reader.remarks('black')).not.toEqual(reader.remarks('white'));
      expect(Object.keys(reader.remarks('black'))).toEqual(Object.keys(reader.remarks('white')));
      const watcher = language(null);
      expect(watcher.remarks('black')).toEqual(reader.remarks('white'));
      expect(language('black').remarks('black')).toEqual(reader.remarks('white'));
    }
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
