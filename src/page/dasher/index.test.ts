import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageKey } from '#shared/storage.ts';
import { dasher, interceptDasherFetch, isDasherGet } from './index.ts';

const PAYLOAD = {
  user: { id: 'alice', name: 'Alice' },
  lang: { current: 'en-US', accepted: ['en-US'], list: [['en-US', 'English']] },
  sound: { list: ['standard'] },
  background: { current: 'dark', image: '' },
  board: {
    is3d: false,
    d2: { current: 'brown', list: [{ name: 'brown', featured: true }] },
    d3: { current: 'Woodi', list: [{ name: 'Woodi', featured: true }] },
  },
  piece: {
    d2: { current: 'cburnett', list: [{ name: 'cburnett', featured: true }] },
    d3: { current: 'Basic', list: [{ name: 'Basic', featured: true }] },
  },
  coach: false,
  streamer: false,
};

let originalFetch: typeof window.fetch;

beforeEach(() => {
  originalFetch = window.fetch;
});

afterEach(() => {
  window.fetch = originalFetch;
  localStorage.clear();
  Reflect.deleteProperty(window, 'site');
  delete document.body.dataset.user;
  delete document.body.dataset.theme;
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe('isDasherGet', () => {
  it('matches same-origin GET `/dasher` only', () => {
    expect(isDasherGet('/dasher')).toBe(true);
    expect(isDasherGet(`${location.origin}/dasher?_=1`)).toBe(true);
    expect(isDasherGet(new Request(`${location.origin}/dasher`))).toBe(true);
    expect(isDasherGet('/dasher', { method: 'POST' })).toBe(false);
    expect(isDasherGet('/dasher/sub')).toBe(false);
    expect(isDasherGet('https://example.com/dasher')).toBe(false);
  });
});

describe('interceptDasherFetch', () => {
  it('stores a cold `/dasher` fetch, serves subsequent calls from storage, and revalidates when stale', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-17T10:00:00Z'));
    document.body.dataset.user = 'alice';
    document.body.dataset.theme = 'dark';

    const networkFetch = vi.fn<typeof window.fetch>(
      async () =>
        new Response(JSON.stringify(PAYLOAD), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    window.fetch = networkFetch;
    interceptDasherFetch();

    // First call hits the network and populates storage.
    const first = await window.fetch('/dasher');
    expect(networkFetch).toHaveBeenCalledTimes(1);
    expect(await first.json()).toEqual(PAYLOAD);
    await vi.waitFor(() => {
      expect(localStorage.getItem(StorageKey.dasherCache)).not.toBeNull();
    });

    // Second call resolves from storage with live page state, without calling networkFetch.
    document.body.dataset.theme = 'light';
    const second = await window.fetch('/dasher');
    expect(networkFetch).toHaveBeenCalledTimes(1);
    const secondJson: unknown = await second.json();
    expect(secondJson).toMatchObject({ background: { current: 'light' } });

    // Non-dasher requests pass straight through.
    await window.fetch('/api/account');
    expect(networkFetch).toHaveBeenCalledTimes(2);

    // Once stale, serves immediately and triggers a single background refresh.
    vi.advanceTimersByTime(11 * 60 * 1000);
    const third = await window.fetch('/dasher');
    expect(await third.json()).toMatchObject({ user: { id: 'alice' } });
    expect(networkFetch).toHaveBeenCalledTimes(3);
  });
});

describe('dasher feature warmup', () => {
  it('preloads `dasher` CSS and primes a cold `/dasher` cache when `#dasher_app` is present', async () => {
    vi.useFakeTimers();
    document.body.dataset.user = 'alice';
    document.body.innerHTML = '<div id="dasher_app"></div>';

    const loadCss = vi.fn<(location: { readonly key: string }) => void>();
    Object.assign(window, {
      site: {
        asset: {
          loadCss,
          jsModule: (name: string) => `compiled/${name}.abc.js`,
          url: (path: string) => `data:text/javascript,//${path}`,
        },
      },
    });

    const networkFetch = vi.fn<typeof window.fetch>(
      async () => new Response(JSON.stringify(PAYLOAD), { status: 200 }),
    );
    window.fetch = networkFetch;

    dasher.start();
    vi.advanceTimersByTime(3000);

    await vi.waitFor(() => {
      expect(loadCss).toHaveBeenCalledWith({ key: 'dasher' });
      expect(networkFetch).toHaveBeenCalledWith(
        '/dasher',
        expect.objectContaining({
          credentials: 'same-origin',
        }),
      );
    });
  });
});
