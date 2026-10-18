import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { flush } from '#shared/testing/timers.ts';
import { createFlagsSync } from './flags.ts';
// The original's request, and the bars it marked.
import legacy from './fixtures/legacy-flags.json' with { type: 'json' };

const readFlags = (): (string | null)[] =>
  queryAll(document, '.ruser, a.user-link', HTMLElement).map(bar => bar.dataset.lnExtFlag ?? null);

const readImages = (): string[] =>
  queryAll(document, '.ruser, a.user-link', HTMLElement).map(bar =>
    bar.style.getPropertyValue('--ln-ext-flag'),
  );

// The original showed emoji, which Windows draws as two letters: the codes
// stand in for them, beside Lichess's images.
const FLAGS = [null, 'FR', null, null, 'FR', 'GB-SCT', null];
const image = (code: string): string => `url("https://lichess1.org/assets/_v1/flags/${code}.webp")`;
const IMAGES = ['', image('FR'), '', '', image('FR'), image('GB-SCT'), ''];

beforeEach(() => {
  document.body.dataset.assetUrl = 'https://lichess1.org';
  document.body.dataset.assetVersion = 'v1';
});

afterEach(() => {
  document.body.innerHTML = '';
  for (const key of Object.keys(document.body.dataset)) delete document.body.dataset[key];
  vi.useRealTimers();
});

describe('country flags', () => {
  const users = [
    { id: 'alice', profile: { flag: 'FR' } },
    { id: 'bob' },
    { id: 'carol', profile: { flag: 'GB-SCT' } },
  ];

  it('asks for every missing name at once, and marks the bars as the original did', async () => {
    const requests: { url: string; init: RequestInit | undefined }[] = [];
    vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
      requests.push({ url, init });
      return Promise.resolve(new Response(JSON.stringify(users)));
    });
    const sync = createFlagsSync();
    document.body.innerHTML = legacy.html;
    sync();
    expect(readFlags()).toEqual(legacy.loading);
    await flush();
    sync();
    expect(readFlags()).toEqual(FLAGS);
    expect(readImages()).toEqual(IMAGES);
    expect(
      requests.map(({ url, init }) => ({ url, method: init?.method, body: init?.body })),
    ).toEqual(legacy.requests);
    sync();
    expect(requests).toHaveLength(1);
  });

  it('shows no flag while the API fails, and asks again later, less and less often', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    let api: 'offline' | 'rate-limited' | 'up' = 'offline';
    let requests = 0;
    vi.stubGlobal('fetch', async () => {
      requests++;
      if (api === 'offline') throw new Error('offline');
      if (api === 'rate-limited') return new Response('Too many requests', { status: 429 });
      return new Response(JSON.stringify(users));
    });
    const sync = createFlagsSync();
    document.body.innerHTML = legacy.html;
    // Ticks until `ms` have passed, one a second.
    async function tickFor(ms: number): Promise<void> {
      for (let waited = 0; waited < ms; waited += 1000) {
        sync();
        await flush();
        vi.advanceTimersByTime(1000);
      }
    }
    await tickFor(1000);
    expect(readFlags().every(flag => flag === null)).toBe(true);
    expect(requests).toBe(1);
    api = 'rate-limited';
    await tickFor(10_000);
    expect(requests).toBe(2);
    // Twice as long after a second failure.
    await tickFor(19_000);
    expect(requests).toBe(2);
    api = 'up';
    await tickFor(2000);
    expect(requests).toBe(3);
    sync();
    expect(readFlags()).toEqual(FLAGS);
    expect(readImages()).toEqual(IMAGES);
  });
});
