import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chesscomRating } from '#shared/chesscom-rating/convert.ts';
import { keepChesscomShown } from '#shared/chesscom-rating/shown.ts';
import { keepOwnName } from '#shared/own-name.ts';
import { flush } from '#shared/testing/timers.ts';
import { accountRating } from './account-rating.ts';

const root = document.documentElement;
const KEY = 'ln-ext-account-rating';
const MAX_AGE = 5 * 60 * 1000;

const apiUser = {
  perfs: { blitz: { games: 25, rating: 1584 }, rapid: { games: 78, rating: 1673 } },
};

function signIn(user: string | null): void {
  document.body.innerHTML = user === null ? '' : '<a id="user_tag">Eresy</a>';
  if (user === null) delete document.body.dataset.user;
  else document.body.dataset.user = user;
}

const keep = (user: string, at: number): void =>
  localStorage.setItem(
    KEY,
    JSON.stringify({
      user,
      at,
      top: { speed: 'blitz', rating: 1600, provisional: true },
    }),
  );

const shown = (): [string | undefined, string] => [
  root.dataset.lnExtAccountPerf,
  root.style.getPropertyValue('--ln-ext-account-rating'),
];

const chars = (): string => root.style.getPropertyValue('--ln-ext-account-chars');

const initial = (): string => root.style.getPropertyValue('--ln-ext-account-initial');

let fetchUser: ReturnType<typeof vi.fn<(url: string) => Promise<Response>>>;

beforeEach(() => {
  fetchUser = vi.fn<(url: string) => Promise<Response>>(() =>
    Promise.resolve(new Response(JSON.stringify(apiUser))),
  );
  vi.stubGlobal('fetch', fetchUser);
});

afterEach(() => {
  vi.unstubAllGlobals();
  keepOwnName(null);
  localStorage.clear();
  delete root.dataset.lnExtAccountPerf;
  root.removeAttribute('style');
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

  it('shows none with Lichess’s "Show player ratings" off, which <body> says', async () => {
    signIn('eresy');
    document.body.classList.add('no-rating');
    keep('eresy', Date.now());
    accountRating.start();
    await flush();
    expect(shown()).toEqual([undefined, '']);
    document.body.classList.remove('no-rating');
  });

  it('asks Lichess when the kept one is 5 minutes old, and keeps the answer', async () => {
    signIn('eresy');
    keep('eresy', Date.now() - MAX_AGE - 1);
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

  it('gives the pill the label’s length, its mark included', async () => {
    signIn('eresy');
    keep('eresy', Date.now() - MAX_AGE - 1);
    accountRating.start();
    expect(chars()).toBe('5');
    await flush();
    expect(chars()).toBe('4');
  });

  it('keeps the kept rating when Lichess fails', async () => {
    signIn('eresy');
    keep('eresy', Date.now() - MAX_AGE - 1);
    fetchUser.mockRejectedValue(new TypeError('offline'));
    accountRating.start();
    await flush();
    expect(shown()).toEqual(['blitz', '"1600?"']);
  });

  it('shows none once hidden in the settings', async () => {
    signIn('eresy');
    keep('eresy', Date.now());
    localStorage.setItem('ln-ext-sidebar-rating', 'hidden');
    accountRating.start();
    expect(shown()).toEqual([undefined, '']);
    expect(chars()).toBe('');
  });

  it('shows the Chess.com equivalent instead with the Chess.com ratings on', () => {
    signIn('eresy');
    keep('eresy', Date.now());
    keepChesscomShown(true);
    accountRating.start();
    const label = String(chesscomRating('blitz', 1600)?.rating);
    expect(shown()).toEqual(['blitz', JSON.stringify(label)]);
    expect(chars()).toBe(String(label.length));
  });

  it('gives the folded sidebar the account’s initial', () => {
    signIn('eresy');
    keep('eresy', Date.now());
    accountRating.start();
    expect(initial()).toBe('"E"');
  });

  it('follows the name the player picked here, and back', async () => {
    signIn('eresy');
    accountRating.start();
    await flush();
    keepOwnName('alex');
    expect(initial()).toBe('"A"');
    keepOwnName(null);
    expect(initial()).toBe('"E"');
  });
});
