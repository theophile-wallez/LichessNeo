import { afterEach, expect, it, vi } from 'vitest';
import { analysis } from '#page/lichess/analysis.ts';
import { fixtureGame, setUp, useFakeEngine } from '#page/review/fixtures/review-script.ts';
import { newSession } from '#page/review/fixtures/unit-review.ts';
import { analyseGame } from './analyse-game.ts';
import { cacheRecords } from './cache.ts';

afterEach(() => {
  vi.useRealTimers();
});

it('reviews the game alone when Lichess brought back the moves played on from its end', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  const booted = useFakeEngine(ctrl, () => 30);
  const records = fixtureGame('passant').records;
  const analysed = { depth: 22, engine: 'full' } as const;
  cacheRecords({ gameId: 'passanta', positions: records.length, records, analysed });
  // Lichess merges the moves it kept in IndexedDB into its tree as the page opens.
  ctrl.jumpToMain(ctrl.mainline.at(-1)?.ply ?? 0);
  ctrl.playUci('a2a3');
  ctrl.playUci('a7a6');
  const facade = analysis();
  if (!facade) throw new Error('no controller');
  const session = newSession();
  const done = analyseGame(session, facade);
  await advance(1000);
  await done;
  expect(session.work.nodes).toHaveLength(records.length);
  expect(session.work.nodes.at(-1)).toBe(ctrl.mainline[records.length - 1]);
  // The review cached for the game is the one found, the engine never asked.
  expect(session.work.analysed).toEqual(analysed);
  expect(booted()).toBe(0);
  expect(session.view.review?.total).toBe(records.length);
});
