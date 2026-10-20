import { z } from 'zod/mini';
import { describe, expect, it } from 'vitest';
import { MOVE_CLASSES } from '#page/review/classes/classes.ts';
import { en } from '#page/review/i18n/en.ts';
import { fr } from '#page/review/i18n/fr.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import { withPieceGlyphs } from '#shared/testing/piece-glyphs.ts';
import {
  type CommentPart,
  commentKey,
  commentMarkup,
  type StreamState,
  streamFor,
} from './markup.ts';
import { verdictTitle } from './title.ts';
import { moveToken, movesToken, numberedMoveToken, pieceToken, squareToken } from './tokens.ts';
// What the original script drew for these comments, tokens and verdicts.
import legacyStreams from './fixtures/legacy-stream.json' with { type: 'json' };
import legacy from './fixtures/legacy-units.json' with { type: 'json' };

const LANGUAGES: Readonly<Record<string, ReviewLanguage>> = { en, fr };
const languageOf = (lang: unknown): ReviewLanguage => LANGUAGES[String(lang)] ?? en;

const StreamSchema = z.array(
  z.object({
    lang: z.string(),
    parts: z.array(z.union([z.tuple([z.string()]), z.tuple([z.string(), z.boolean()])])),
    shown: z.nullable(z.number()),
    dropped: z.boolean(),
    html: z.string(),
  }),
);

const say = (text: string, droppable = false): CommentPart => ({ text, droppable });

function markup(parts: readonly CommentPart[], stream: Partial<StreamState> = {}): string {
  const state = { key: commentKey(parts), shown: Infinity, dropped: 0, ...stream };
  return commentMarkup(parts, { stream: state, language: en }).value;
}

describe('commentMarkup', () => {
  it('draws the comments as the original did', () => {
    for (const { lang, parts, shown, dropped, html } of StreamSchema.parse(legacyStreams)) {
      const comment = parts.map(([text, droppable]) => say(text, droppable ?? false));
      // The original dropped its one droppable sentence, or kept it.
      const stream = {
        key: commentKey(comment),
        shown: shown ?? Infinity,
        dropped: dropped ? 1 : 0,
      };
      const options = { stream, language: languageOf(lang) };
      expect(commentMarkup(comment, options).value).toBe(withPieceGlyphs(html));
    }
  });

  it('draws each token as the original did', () => {
    for (const [kind, value, html] of legacy.tokens) {
      const word = `[[${kind}:${value}]]`;
      expect(markup([say(word)])).toBe(
        `<span class="ln-ext-say"><span class="ln-ext-w">${withPieceGlyphs(html ?? '')}</span> </span>`,
      );
    }
  });

  it('builds the tokens the text carries', () => {
    expect(pieceToken({ color: 'black', role: 'knight' })).toBe('[[p:bn]]');
    expect(moveToken('Qxf7#', 'white')).toBe('[[m:w:Qxf7#]]');
    expect(squareToken('e4')).toBe('[[s:e4]]');
    expect(numberedMoveToken('12...', 'Qb6', 'black')).toBe('[[n:12...:b:Qb6]]');
  });

  it('keeps a numbered move’s number with its chip', () => {
    expect(markup([say('[[n:12...:b:Qb6]]')])).toBe(
      `<span class="ln-ext-say"><span class="ln-ext-w"><span class="ln-ext-num">12... <span class="ln-ext-mv"><i class="ln-ext-pc ln-ext-pc-bq"></i>b6</span></span></span> </span>`,
    );
  });

  it('escapes the text around the tokens', () => {
    expect(markup([say('a<b [[s:e4]]&')])).toBe(
      '<span class="ln-ext-say"><span class="ln-ext-w">a&lt;b </span><span class="ln-ext-w"><b class="ln-ext-sq">e4</b>&amp;</span> </span>',
    );
  });

  it('hides the words not typed yet, and leaves a dropped sentence out', () => {
    const parts = [say('one two', true), say('three')];
    expect(markup(parts, { shown: 1 })).toContain(
      '<span class="ln-ext-w">one </span><span class="ln-ext-w ln-ext-w--off">two</span>',
    );
    expect(markup(parts, { dropped: 1 })).toBe(
      '<span class="ln-ext-say"><span class="ln-ext-w">three</span> </span>',
    );
  });

  it('leaves out as many droppable sentences as were dropped, the first first', () => {
    const parts = [say('one', true), say('two'), say('three', true)];
    const words = (dropped: number): string[] =>
      [...markup(parts, { dropped }).matchAll(/ln-ext-w">(\w+)/g)].map(([, word]) => word ?? '');
    expect([0, 1, 2].map(words)).toEqual([['one', 'two', 'three'], ['two', 'three'], ['two']]);
  });
});

describe('streamFor', () => {
  it('starts over for a new comment only', () => {
    const parts = [say('Hello there.')];
    const typing: StreamState = { key: commentKey(parts), shown: 2, dropped: 1 };
    expect(streamFor(typing, parts)).toBe(typing);
    expect(streamFor(typing, [say('Something else.')])).toEqual({
      key: 'Something else.',
      shown: 0,
      dropped: 0,
    });
    expect(commentKey([say('a'), say('b', true)])).toBe('a|b');
  });
});

describe('verdictTitle', () => {
  it('writes the verdicts as the original did', () => {
    // A best move that mates says so instead, a deliberate change.
    for (const [lang, key, san, html] of legacy.titles.filter(
      ([, legacyClass, san]) => !(legacyClass === 'best' && String(san).endsWith('#')),
    )) {
      const moveClass = MOVE_CLASSES.find(candidate => candidate === key);
      if (!moveClass) throw new Error(`unknown class ${key}`);
      expect(verdictTitle(moveClass, String(san), languageOf(lang)).value).toBe(html);
    }
  });

  it('says a best move mates rather than that it’s best', () => {
    const queen = '<span class="ln-ext-fig">♛</span>';
    expect(verdictTitle('best', 'Qh5#', en).value).toBe(`${queen}h5# is checkmate`);
    expect(verdictTitle('best', 'Qh5#', fr).value).toBe(`${queen}h5# est mat`);
  });
});

describe('the languages’ helpers', () => {
  it('punctuate as the original did', () => {
    for (const [text, french, english] of legacy.typos) {
      expect(fr.typography(String(text))).toBe(french);
      expect(en.typography(String(text))).toBe(english);
    }
  });
});

describe('movesToken', () => {
  it('writes a line unnumbered, each chip playing the line up to itself', () => {
    const moves = [
      { san: 'Nc2+', color: 'black', number: 30 },
      { san: 'Kd2', color: 'white', number: 31 },
    ] as const;
    expect(movesToken(moves)).toBe('[[m:b:Nc2+]] [[m:w:Kd2]]');
    expect(movesToken(moves, { base: 'a', ucis: ['d4c2', 'e1d2'] })).toBe(
      '[[m:b:Nc2+@a:d4c2]] [[m:w:Kd2@a:d4c2,e1d2]]',
    );
  });
});
