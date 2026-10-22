import { afterEach, describe, expect, it } from 'vitest';
import { flush } from '#shared/testing/timers.ts';
import { z } from 'zod/mini';
import type { Color } from '#shared/chess/types.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { StoredRecordCodec } from '#page/review/evaluation/stored.ts';
import { CLASS_COLORS } from '#page/review/classes/classes.ts';
import { en } from '#page/review/i18n/en.ts';
import { UNIT_CASES } from '#page/review/fixtures/unit-cases.ts';
import { builtSession, newSession } from '#page/review/fixtures/unit-review.ts';
import { MODES, ModeSchema } from '#page/review/session.ts';
import { PanelActionSchema } from './actions.ts';
import { badgeMarkup, landingSquare, reviewArrowsFor } from './board-badge.ts';
import { type AvatarInput, avatarMarkup, takeReaction } from './coach-avatar.ts';
import { barPosition, type BarInput } from './eval-bar.ts';
import { indexAt } from './graph.ts';
import { graphMarkup, knownRuns } from './graph-markup.ts';
import { evalChip, header } from './markup.ts';
import { openingMarkup } from './opening.ts';
import { overflows } from './stream.ts';
import { keepMarked } from './render.ts';
import { playerName } from './summary-players.ts';
import { tipPlacement } from './tooltip.ts';
// What the original script drew for the same inputs.
import legacy from './fixtures/legacy.json' with { type: 'json' };

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

describe('the graph', () => {
  const drawn = UNIT_CASES.builds.flatMap(build => {
    const { review } = builtSession(build).view;
    return build.graphs.map(size => ({ review, size }));
  });

  it.each(drawn.map(({ review, size }, i) => [i, review, size, legacy.graphs[i]]))(
    'draws graph %i as the original did',
    (_, review, { ply, width, height }, expected) => {
      if (!review) throw new Error('no review');
      expect(graphMarkup(review, ply, { width, height }).value).toBe(expected);
    },
  );

  it('splits the known positions into runs', () => {
    const record = { cp: 0, whiteWinChance: 50, secondLineWinChance: null, best: null };
    expect(knownRuns([record, record, null, record, null, null, record])).toEqual([
      [0, 1],
      [3],
      [6],
    ]);
    expect(knownRuns([null, null])).toEqual([]);
  });

  it('finds the position under the pointer, within the game', () => {
    const box = { padX: 16, width: 300, height: 88 };
    expect(indexAt(8, box, 30)).toBe(0);
    expect(indexAt(158, box, 30)).toBe(15);
    expect(indexAt(1000, box, 30)).toBe(30);
    expect(indexAt(-50, box, 30)).toBe(0);
  });
});

describe('markup', () => {
  // The chips' records, as the original was given them.
  const RecordSchema = z.nullable(StoredRecordCodec);

  it.each(UNIT_CASES.chips.map((record, i) => [i, record, legacy.chips[i]]))(
    'draws score chip %i as the original did',
    (_, record, expected) => {
      expect(evalChip(RecordSchema.parse(record)).value).toBe(expected);
    },
  );

  // The original wrote no back button as ''.
  const BackSchema = z.union([
    ModeSchema,
    z.pipe(
      z.literal(''),
      z.transform(() => null),
    ),
  ]);

  it.each(UNIT_CASES.headers.map(([title = '', back = ''], i) => [title, back, legacy.headers[i]]))(
    'draws the header “%s” (back to %s) as the original did',
    (title, back, expected) => {
      expect(header(title, BackSchema.parse(back), en).value).toBe(expected);
    },
  );

  const PlayerSchema = z.nullable(
    z.object({
      user: z.optional(z.object({ username: z.optional(z.string()) })),
      name: z.optional(z.string()),
      ai: z.optional(z.number()),
    }),
  );

  it.each(UNIT_CASES.players.map((player, i) => [i, player, legacy.names[i]]))(
    'names player %i as the original did',
    (_, player, expected) => {
      const parsed = PlayerSchema.parse(player);
      expect(playerName(parsed ? { color: 'white', ...parsed } : undefined, en)).toBe(expected);
    },
  );

  it('names the opening’s family in bold, then its variation', () => {
    expect(openingMarkup({ name: 'Ruy Lopez: Morphy Defense: Norwegian', eco: 'C70' }).value).toBe(
      '<i class="ln-ext-opening__icon"></i><span class="ln-ext-opening__eco">C70</span><span class="ln-ext-opening__name"><b>Ruy Lopez</b>: Morphy Defense: Norwegian</span>',
    );
    expect(openingMarkup({ name: 'Start <position>', eco: '' }).value).toBe(
      '<i class="ln-ext-opening__icon"></i><span class="ln-ext-opening__name"><b>Start &lt;position&gt;</b></span>',
    );
  });
});

const record = (whiteWinChance: number): PositionRecord => ({
  cp: 0,
  whiteWinChance,
  secondLineWinChance: null,
  best: null,
});

const bar = (input: Partial<BarInput>): ReturnType<typeof barPosition> =>
  barPosition({
    review: { positions: [record(50), record(60)] },
    reviewing: true,
    live: false,
    onGame: true,
    ply: 1,
    bestBefore: null,
    offGame: undefined,
    last: null,
    ...input,
  });

const badgeStyle = (uci: string, orientation: Color): string | undefined =>
  /style="([^"]*)"/.exec(badgeMarkup({ moveClass: 'best', uci, san: '', orientation }).value)?.[1];

/** Where the badge's style puts it, without its color. */
const position = (uci: string, orientation: Color): string | undefined =>
  badgeStyle(uci, orientation)?.split(';--')[0];

describe('the board', () => {
  it('puts the badge on the square the piece landed on, the king’s for a castle', () => {
    expect(landingSquare('e2e4', 'e4')).toBe('e4');
    expect(landingSquare('e1h1', 'O-O')).toBe('g1');
    expect(landingSquare('e8a8', 'O-O-O+')).toBe('c8');
    expect(
      badgeMarkup({ moveClass: 'best', uci: 'g1f3', san: 'Nf3', orientation: 'white' }).value,
    ).toMatch(/^<div class="ln-ext-badge" style="left:75%;top:62\.5%;[^"]*">/);
  });

  it('gives the badge its class’s color, for the base under the icon', () => {
    expect(badgeStyle('e2e4', 'white')).toMatch(
      new RegExp(`;--ln-ext-badge-c:${CLASS_COLORS.best}$`),
    );
  });

  it('puts the badge at the top right of the square as shown', () => {
    expect(position('b2a1', 'white')).toBe('left:12.5%;top:87.5%');
    expect(position('b2a1', 'black')).toBe('left:100%;top:0%');
    expect(position('g2h8', 'black')).toBe('left:12.5%;top:87.5%');
    // A move with no square to land on puts the badge nowhere, as before.
    expect(position('', 'white')).toBe('left:0%;top:NaN%');
    expect(position('', 'black')).toBe('left:112.5%;top:NaN%');
  });

  it('draws the best move for a move that needed it, and the engine’s off the game', () => {
    expect(
      reviewArrowsFor({ moveClass: 'mistake', best: 'e2e4', threat: null, engine: null }),
    ).toEqual([{ orig: 'e2', dest: 'e4', brush: 'best' }]);
    expect(
      reviewArrowsFor({ moveClass: 'best', best: 'e2e4', threat: null, engine: 'g8f6' }),
    ).toEqual([{ orig: 'g8', dest: 'f6', brush: 'engine' }]);
    expect(reviewArrowsFor({ moveClass: null, best: null, threat: null, engine: 'zz' })).toEqual(
      [],
    );
  });

  it('shows the eval bar’s score for the position on the board', () => {
    expect(bar({})?.whiteWinChance).toBe(60);
    expect(bar({ bestBefore: record(10) })?.whiteWinChance).toBe(10);
    expect(bar({ onGame: false, offGame: record(70) })?.whiteWinChance).toBe(70);
    // A move off the game waits for its engine with the last score.
    expect(bar({ onGame: false, last: record(33) })?.whiteWinChance).toBe(33);
    expect(
      bar({ reviewing: false, onGame: false, offGame: record(70), last: record(33) }),
    ).toBeNull();
    expect(bar({ live: true })).toBeNull();
    expect(bar({ review: null, last: record(33) })).toBeNull();
  });
});

describe('the panel', () => {
  it('places the tooltip over its anchor, inside the window', () => {
    expect(
      tipPlacement({
        anchor: { left: 100, top: 200, width: 40, height: 20 },
        width: 120,
        height: 30,
        viewportWidth: 1000,
      }),
    ).toEqual({
      left: 60,
      top: 160,
      tail: 60,
      below: false,
    });
    expect(
      tipPlacement({
        anchor: { left: 0, top: 50, width: 20, height: 20 },
        width: 120,
        height: 30,
        viewportWidth: 1000,
      }).left,
    ).toBe(8);
    expect(
      tipPlacement({
        anchor: { left: 990, top: 50, width: 20, height: 20 },
        width: 120,
        height: 30,
        viewportWidth: 1000,
      }),
    ).toEqual({
      left: 872,
      top: 10,
      tail: 128,
      below: false,
    });
  });

  it('places the tooltip under its anchor when there’s no room above', () => {
    expect(
      tipPlacement({
        anchor: { left: 100, top: 30, width: 40, height: 20 },
        width: 120,
        height: 30,
        viewportWidth: 1000,
      }),
    ).toEqual({
      left: 60,
      top: 60,
      tail: 60,
      below: true,
    });
  });

  it('drops a sentence only when a whole line overflows', () => {
    expect(overflows({ scrollHeight: 45, clientHeight: 36, lineHeight: '18px' })).toBe(false);
    expect(overflows({ scrollHeight: 46, clientHeight: 36, lineHeight: '18px' })).toBe(true);
    expect(overflows({ scrollHeight: 46, clientHeight: 36, lineHeight: 'normal' })).toBe(true);
  });
});

describe('the coach', () => {
  it('pops its marks once per move and verdict', () => {
    const coach = { id: 2, reacted: '', avatar: null };
    expect(takeReaction(coach, 'blunder', '/?')).toBe(true);
    expect(takeReaction(coach, 'blunder', '/?')).toBe(false);
    expect(takeReaction(coach, 'blunder', '/?WG')).toBe(true);
    // A verdict the face doesn't react to has no marks.
    expect(takeReaction(coach, 'good', '/?WG.>')).toBe(false);
    expect(takeReaction(coach, null, '/?')).toBe(false);
  });

  it('draws the same avatar for the same input', () => {
    const input: AvatarInput = { coachId: 2, moveClass: 'blunder', react: true, label: 'Coach' };
    const markup = avatarMarkup(input).value;
    expect(avatarMarkup(input).value).toBe(markup);
    expect(markup).toContain('ln-ext-coach__avatar--react');
    expect(markup).toContain('data-ln-ext-coach-id="2" data-ln-ext-mood="angry"');
  });

  it('takes the mood it’s given while there’s no verdict, the verdict’s once there is', () => {
    const waiting: AvatarInput = { coachId: 2, moveClass: null, react: false, label: 'Coach' };
    expect(avatarMarkup(waiting).value).toContain('data-ln-ext-mood="neutral"');
    expect(avatarMarkup({ ...waiting, idle: 'thinking' }).value).toContain(
      'data-ln-ext-mood="thinking"',
    );
    expect(avatarMarkup({ ...waiting, moveClass: 'blunder', idle: 'thinking' }).value).toContain(
      'data-ln-ext-mood="angry"',
    );
  });
});

describe('the buttons', () => {
  it('read their actions, and nothing else', () => {
    expect(MODES).toEqual(['normal', 'summary', 'moves', 'live']);
    for (const action of [...MODES, 'play', 'best', 'coach'])
      expect(PanelActionSchema.safeParse(action).success).toBe(true);
    expect(PanelActionSchema.safeParse('replay').success).toBe(false);
    expect(PanelActionSchema.safeParse(undefined).success).toBe(false);
  });
});

describe('the page’s marks', () => {
  it('come back as soon as Lichess rewrites <html>’s class', async () => {
    const root = document.documentElement;
    const session = newSession();
    session.view.mode = 'moves';
    keepMarked(session);
    root.className = 'light';
    await flush();
    expect([...root.classList]).toEqual(['light', 'ln-ext-review', 'ln-ext-review-moves']);
    root.className = '';
  });
});
