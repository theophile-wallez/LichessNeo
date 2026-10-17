import { analysis, type Analysis } from '#page/lichess/analysis.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import { refresh, seeDeep } from '#page/review/game/work.ts';
import { en } from '#page/review/i18n/en.ts';
import { createSession, type Session } from '#page/review/session.ts';
import { createElements } from '#page/review/view/elements.ts';
import { type FakeController, fakeController, withFakeSite } from './fake-lichess.ts';
import { fixtureGame } from './review-script.ts';
import type { FixtureGame } from './replay.ts';
import { roughOf, type UNIT_CASES } from './unit-cases.ts';

// Test support: a review session over a fake game, for the unit tests.

/** Takes a full-depth record, unless the position has one, as the analysis does. */
export function setDeep(session: Session, index: number, record: PositionRecord): void {
  if (session.work.deep[index]) return;
  session.work.deep[index] = record;
  seeDeep(session, index, record);
}

export const newSession = (): Session =>
  createSession({
    language: en,
    coach: 1,
    elements: createElements(),
    redraw: () => {},
    setMode: () => {},
  });

type Players = readonly [Record<string, unknown>, Record<string, unknown>];

export interface FakeGame {
  readonly fixture: FixtureGame;
  readonly ctrl: FakeController;
  readonly facade: Analysis;
}

export function fakeGame(
  game: string,
  options: { speed?: string; players?: Players } = {},
): FakeGame {
  const fixture = fixtureGame(game);
  const ctrl = fakeController({
    id: fixture.id,
    positions: fixture.nodes,
    variant: fixture.chess960 ? 'chess960' : 'standard',
    ...options,
  });
  withFakeSite(ctrl);
  const facade = analysis();
  if (!facade) throw new Error('the fake controller is not a controller');
  return { fixture, ctrl, facade };
}

type BuildCase = (typeof UNIT_CASES.builds)[number];

/** A session whose review was built through `build`'s steps. */
export function builtSession(build: BuildCase): Session {
  const { fixture, facade } = fakeGame(build.game, { speed: build.speed, players: build.players });
  const session = newSession();
  session.work.nodes = facade.mainline;
  session.work.bookPly = fixture.bookPly;
  for (const step of build.steps) {
    for (const i of step.deep) {
      const record = fixture.records[i];
      if (record) setDeep(session, i, record);
    }
    for (const i of step.rough) {
      const record = fixture.records[i];
      if (record) session.work.rough[i] = roughOf(record, i);
    }
    refresh(session, facade);
  }
  return session;
}

/** The game `name`, judged at full depth, its opening from the export. */
export function judgedGame(name: string): FakeGame & { readonly session: Session } {
  const game = fakeGame(name);
  const { fixture, facade } = game;
  const session = newSession();
  session.work.nodes = facade.mainline;
  session.work.bookPly = fixture.bookPly;
  session.view.openingName = fixture.opening;
  for (const [i, record] of fixture.records.entries()) setDeep(session, i, record);
  refresh(session, facade);
  return { ...game, session };
}
