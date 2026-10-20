import { z } from 'zod/mini';
import { describe, expect, it } from 'vitest';
import type { CommentPart } from '#page/review/comment/markup.ts';
import { StoredRecordCodec } from '#page/review/evaluation/stored.ts';
import { fixtureGames, replay } from '#page/review/fixtures/replay.ts';
import { en } from '#page/review/i18n/en.ts';
import { fr } from '#page/review/i18n/fr.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import { judge } from '#page/review/judge/judge.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { explanation, type MoveContext } from './explanation.ts';
import { NO_THREATS } from './threat-facts.ts';
import { findings } from './fact.ts';
import { hash } from './hash.ts';
import { remark } from './remark.ts';
import { advantageName, evaluationLevel, trajectory, type TrajectoryInput } from './trajectory.ts';
// What the original script said about every fixture move, in both languages,
// and its trajectory sentences over a grid of evaluations.
import legacy from './fixtures/legacy.json' with { type: 'json' };
import units from './fixtures/legacy-units.json' with { type: 'json' };
import crafted from './fixtures/legacy-crafted.json' with { type: 'json' };

const LANGUAGES: Readonly<Record<'en' | 'fr', ReviewLanguage>> = { en, fr };

const LegacyPartsSchema = z.array(
  z.union([z.tuple([z.string()]), z.tuple([z.string(), z.boolean()])]),
);
const MoveTextsSchema = z.array(z.object({ remark: z.string(), parts: LegacyPartsSchema }));
const GameTextsSchema = z.array(z.object({ en: MoveTextsSchema, fr: MoveTextsSchema }));

const toParts = (parts: z.infer<typeof LegacyPartsSchema>) =>
  parts.map(([text, droppable]) => ({ text, droppable: droppable ?? false }));

const langs: readonly ('en' | 'fr')[] = ['en', 'fr'];

const NO_CONTEXT: MoveContext = { opening: '', threats: NO_THREATS, turning: false };

// The port's move chips carry the moves they play ([[m:w:Nf3@b:g1f3]]), and an
// error's comment ends on the reply it lets in: the original had neither. Both
// are taken off, so the recordings stay the reference.
const PLAY = /@[ab]:[^\]]*/g;
const withoutPlay = (text: string): string => text.replace(PLAY, '');

/** The fact the coach states about a move, null for none. */
const fact = (move: MoveVerdict, language: ReviewLanguage): string | null =>
  findings(move, language).fact?.text ?? null;

function asRecorded(
  parts: readonly CommentPart[],
  move: MoveVerdict,
  language: ReviewLanguage,
): CommentPart[] {
  const followUp = findings(move, language).followUp?.text;
  return parts
    .filter(part => part.text !== followUp)
    .map(({ text, droppable }) => ({ text: withoutPlay(text), droppable }));
}

describe('the coach’s comment', () => {
  const texts = GameTextsSchema.parse(legacy);

  it.each(langs)('says what the original said, in %s', lang => {
    for (const [index, game] of fixtureGames().entries()) {
      const context = { gameId: game.id, coach: game.coach, language: LANGUAGES[lang] };
      const expected = texts[index]?.[lang] ?? [];
      for (const [i, move] of replay(game).entries()) {
        const said = expected[i];
        const remarked = remark(move, context);
        // A side's first book move has its own remarks, which open its comment: the
        // original's spoke of theory going on.
        const first = move.moveClass === 'book' && move.position.ply <= 2;
        const allowed = first ? LANGUAGES[lang].remarks(move.color).firstMove : [said?.remark];
        expect(allowed, `${game.name} ${move.ply}`).toContain(remarked);
        const recorded = toParts(said?.parts ?? []).map(({ text, droppable }, k) => ({
          text: first && k === 0 ? remarked : text,
          droppable,
        }));
        expect(
          asRecorded(
            explanation(move, context, {
              opening: game.opening,
              threats: NO_THREATS,
              turning: false,
            }),
            move,
            LANGUAGES[lang],
          ),
          `${game.name} ${move.ply}`,
        ).toEqual(recorded);
      }
    }
  });

  it('greets a side’s first book move as a start, and the next ones as theory', () => {
    const game = fixtureGames().find(({ name }) => name === 'opera');
    const moves = game ? replay(game) : [];
    const context = { gameId: game?.id ?? '', coach: 1, language: en };
    const [first, reply, second] = moves;
    if (!first || !reply || !second) throw new Error('no opera game');
    expect([first, reply, second].map(move => move.moveClass)).toEqual(['book', 'book', 'book']);
    expect(en.remarks('white').firstMove).toContain(remark(first, context));
    expect(en.remarks('white').firstMove).toContain(remark(reply, context));
    expect(en.remarks('white').firstMove).not.toContain(remark(second, context));
  });

  it('names checkmate on its own', () => {
    const game = fixtureGames().find(({ name }) => name === 'opera');
    const mate = game ? replay(game).at(-1) : undefined;
    if (!game || !mate) throw new Error('no opera game');
    expect(en.facts.checkmate('black')).toContain(fact(mate, en));
    const [said, ...more] = explanation(
      mate,
      { gameId: game.id, coach: 1, language: fr },
      NO_CONTEXT,
    );
    expect(fr.facts.checkmate('black')).toContain(said?.text);
    expect(more).toEqual([]);
  });
});

const PositionSchema = z.object({
  ply: z.number(),
  fen: z.string(),
  uci: z.optional(z.string()),
  san: z.optional(z.string()),
});
const SaidSchema = z.object({ fact: z.nullable(z.string()), parts: LegacyPartsSchema });
const CraftedSchema = z.array(
  z.object({
    name: z.string(),
    prev: PositionSchema,
    node: z.object({ ...PositionSchema.shape, uci: z.string(), san: z.string() }),
    a: StoredRecordCodec,
    b: StoredRecordCodec,
    cls: z.string(),
    slower: z.boolean(),
    en: SaidSchema,
    fr: SaidSchema,
  }),
);

describe('rarer moves', () => {
  it.each(CraftedSchema.parse(crafted))('are explained as the original did: $name', said => {
    const move = judge({
      previousPosition: said.prev,
      position: said.node,
      before: said.a,
      after: said.b,
      book: false,
      chess960: false,
    });
    expect(move).toMatchObject({ moveClass: said.cls, slower: said.slower });
    for (const lang of langs) {
      const context = { gameId: 'crafted1', coach: 2, language: LANGUAGES[lang] };
      const found = fact(move, LANGUAGES[lang]);
      expect(found === null ? null : withoutPlay(found)).toBe(said[lang].fact);
      expect(asRecorded(explanation(move, context, NO_CONTEXT), move, LANGUAGES[lang])).toEqual(
        toParts(said[lang].parts),
      );
    }
  });
});

describe('trajectory', () => {
  const all = units.recs.map(record =>
    StoredRecordCodec.parse({ wp2: null, best: null, ...record }),
  );

  it('rates evaluations as the original did', () => {
    for (const [i, [, level, english, french]] of units.levels.entries()) {
      const record = all[i];
      if (!record) throw new Error(`no record ${i}`);
      expect(evaluationLevel(record)).toBe(level);
      expect(advantageName(Number(level), record, en)).toBe(english);
      expect(advantageName(Number(level), record, fr)).toBe(french);
    }
  });

  it('tells how the game changed, as the original did', () => {
    for (const [i, j, mover, seed, english, french] of units.trajectories) {
      const before = all[Number(i)];
      const after = all[Number(j)];
      if (!before || !after) throw new Error(`no records ${i}, ${j}`);
      const input: TrajectoryInput = {
        before,
        after,
        mover: mover === 'w' ? 'white' : 'black',
        seed: Number(seed),
      };
      expect(trajectory(input, en)).toBe(english);
      expect(trajectory(input, fr)).toBe(french);
    }
  });
});

describe('hash', () => {
  it('is the original’s FNV-1a', () => {
    for (const [text, value] of units.hashes) expect(hash(String(text))).toBe(value);
  });
});
