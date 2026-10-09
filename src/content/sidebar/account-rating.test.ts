import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flush } from '#shared/testing/timers.ts';
import { accountRating } from './account-rating.ts';

const root = document.documentElement;
const KEY = 'cdc-account-rating';
const HOUR = 60 * 60 * 1000;

const apiUser = {
  perfs: { blitz: { games: 25, rating: 1584 }, rapid: { games: 78, rating: 1673 } },
};

function signIn(user: string | null): void {
  document.body.innerHTML = user === null ? '' : '<a id="user_tag">Eresy</a>';
  if (user === null) delete document.body.dataset.user;
  else document.body.dataset.user = user;
}

const keep = (user: string, at: number, rating = 1600): void =>
  localStorage.setItem(
    KEY,
    JSON.stringify({ user, at, top: { speed: 'blitz', rating, provisional: true } }),
  );

const shown = (): [string | undefined, string] => [
  root.dataset.cdcAccountPerf,
  root.style.getPropertyValue('--cdc-account-rating'),
];

let fetchUser: ReturnType<typeof vi.fn<(url: string) => Promise<Response>>>;

beforeEach(() => {
  fetchUser = vi.fn<(url: string) => Promise<Response>>(() =>
    Promise.resolve(new Response(JSON.stringify(apiUser))),
  );
  vi.stubGlobal('fetch', fetchUser);
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
  delete root.dataset.cdcAccountPerf;
  root.style.removeProperty('--cdc-account-rating');
  signIn(null);
});

describe('the account rating', () => {
  it('shows the kept rating at once, and keeps it while it is fresh', async () => {
    signIn('eresy');
    keep('eresy', Date.now());
    accountRating.start();
    expect(shown()).toEqual(['blitz', '"1600?"']);
    await flush();
    expect(fetchUser).not.toHaveBeenCalled();
    expect(shown()).toEqual(['blitz', '"1600?"']);
  });

  it('asks Lichess when the kept one is an hour old, and keeps the answer', async () => {
    signIn('eresy');
    keep('eresy', Date.now() - HOUR - 1);
    accountRating.start();
    await flush();
    expect(fetchUser).toHaveBeenCalledWith('/api/user/eresy', expect.anything());
    expect(shown()).toEqual(['rapid', '"1673"']);
    expect(localStorage.getItem(KEY)).toContain('"rapid"');
  });

  it('drops a rating kept for another account', async () => {
    signIn('someone');
    keep('eresy', Date.now());
    fetchUser.mockResolvedValue(new Response('', { status: 404 }));
    accountRating.start();
    await flush();
    expect(shown()).toEqual([undefined, '']);
  });

  it('shows nothing signed out', async () => {
    keep('eresy', Date.now());
    accountRating.start();
    await flush();
    expect(fetchUser).not.toHaveBeenCalled();
    expect(shown()).toEqual([undefined, '']);
  });

  it('keeps the kept rating when Lichess fails', async () => {
    signIn('eresy');
    keep('eresy', Date.now() - HOUR - 1);
    fetchUser.mockRejectedValue(new TypeError('offline'));
    accountRating.start();
    await flush();
    expect(shown()).toEqual(['blitz', '"1600?"']);
  });
});
