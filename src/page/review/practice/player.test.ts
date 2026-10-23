import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, text } from '#page/review/fixtures/fake-api.ts';
import { flush } from '#shared/testing/timers.ts';
import { levelGroups } from './player.ts';

const USER = {
  id: 'alice',
  perfs: {
    bullet: { games: 900, rating: 2100 },
    blitz: { games: 120, rating: 1650, rd: 50 },
    rapid: { games: 300, rating: 1720 },
    classical: { games: 0, rating: 1500 },
    puzzle: { games: 80, rating: 1900 },
  },
};

/** The ratings asked for, with the callback told once they're in. */
async function ratingsOf(answer: Response) {
  const asked = fakeApi([[/^\/api\/user\//, () => answer]]);
  const { playerRatings } = await import('./player.ts');
  const onRatings = vi.fn<() => void>();
  const answered = new Promise<void>(resolve => {
    onRatings.mockImplementation(resolve);
  });
  expect(playerRatings(onRatings)).toBeNull();
  // Not named `then`: the result would be a thenable, which `await` calls.
  return { asked, onRatings, answered, playerRatings };
}

beforeEach(() => {
  vi.resetModules();
  document.body.dataset.user = 'Alice';
});

afterEach(() => {
  delete document.body.dataset.user;
});

describe('playerRatings', () => {
  it('reads the most played of blitz, rapid and classical, and the puzzles’', async () => {
    const { asked, onRatings, answered, playerRatings } = await ratingsOf(
      text(JSON.stringify(USER)),
    );
    await answered;
    expect(playerRatings(onRatings)).toEqual({ games: 1720, puzzles: 1900 });
    expect(onRatings).toHaveBeenCalledTimes(1);
    expect(asked.map(request => request.url)).toEqual(['/api/user/Alice']);
  });

  it('asks once while the answer is on its way', async () => {
    const { asked, onRatings, answered, playerRatings } = await ratingsOf(
      text(JSON.stringify(USER)),
    );
    expect(playerRatings(onRatings)).toBeNull();
    await answered;
    expect(asked).toHaveLength(1);
  });

  it('has no ratings for a player with no games, or an answer it can’t read', async () => {
    const empty = await ratingsOf(text(JSON.stringify({ perfs: {} })));
    await empty.answered;
    expect(empty.playerRatings(empty.onRatings)).toEqual({ games: null, puzzles: null });
    vi.resetModules();
    const broken = await ratingsOf(text('{"perfs":"none"}'));
    await broken.answered;
    expect(broken.playerRatings(broken.onRatings)).toBeNull();
  });

  it('asks nothing signed out, and stays without ratings on an error', async () => {
    delete document.body.dataset.user;
    const signedOut = await ratingsOf(text(JSON.stringify(USER)));
    expect(signedOut.asked).toHaveLength(0);
    vi.resetModules();
    document.body.dataset.user = 'Alice';
    const failed = await ratingsOf(text('', 429));
    await failed.answered;
    expect(failed.playerRatings(failed.onRatings)).toBeNull();
    await flush();
    expect(failed.asked).toHaveLength(1);
  });
});

describe('levelGroups', () => {
  it('are the player’s own rating group and the one above', () => {
    expect(levelGroups(1650)).toEqual([1600, 1800]);
    expect(levelGroups(1600)).toEqual([1600, 1800]);
    expect(levelGroups(300)).toEqual([400, 1000]);
    expect(levelGroups(2700)).toEqual([2500]);
  });
});
