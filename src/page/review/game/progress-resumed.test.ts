import { afterEach, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { StoredRecordCodec } from '#page/review/evaluation/stored.ts';
import {
  fixtureGame,
  SCRIPT_DELAY,
  setUp,
  useFakeEngine,
} from '#page/review/fixtures/review-script.ts';
import { review } from '#page/review/index.ts';

// A started review can't be stopped: this file has its window to itself.

afterEach(() => {
  vi.useRealTimers();
});

it('takes up a saved analysis where it was left', async () => {
  const { ctrl, advance } = setUp({ game: 'passant', lang: 'en', cached: false, steps: [] });
  const { records } = fixtureGame('passant');
  const saved = 20;
  const progress = records.map((record, i) => (i < saved ? record : undefined));
  localStorage.setItem(
    `ln-ext-review-progress:passanta:${records.length}:v2`,
    JSON.stringify(z.encode(z.array(z.optional(StoredRecordCodec)), progress)),
  );
  let deep = 0;
  useFakeEngine(ctrl, search => {
    if (search.depth >= 16) deep++;
    return SCRIPT_DELAY(search);
  });
  review.start();
  await advance(10_000);
  expect(localStorage.getItem(`ln-ext-review:passanta:${records.length}:v2`)).not.toBeNull();
  expect(deep).toBe(records.length - saved);
});
