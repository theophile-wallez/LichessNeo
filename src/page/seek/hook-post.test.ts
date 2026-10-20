import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CustomSeek } from '#shared/custom-seek.ts';
import { hookForm, postHook, postHookLike, setupUrl } from './hook-post.ts';

const SEEK: CustomSeek = { variant: 'crazyhouse', minutes: 0.5, increment: 2, rated: true };

// The requests Lichess got, and its answer to them.
let requests: { path: string; init: RequestInit | undefined }[];

function answer(response: Response | Error): void {
  requests = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((path: string, init?: RequestInit) => {
      requests.push({ path, init });
      return response instanceof Error ? Promise.reject(response) : Promise.resolve(response);
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("a lobby seek's post", () => {
  it("fills the setup form's fields as Lichess's lobby sends them", () => {
    expect(Object.fromEntries(hookForm(SEEK))).toEqual({
      variant: '10',
      timeMode: '1',
      time: '0.5',
      increment: '2',
      days: '2',
      mode: '1',
      color: 'random',
    });
    expect(hookForm({ ...SEEK, variant: 'standard', rated: false }).get('variant')).toBe('1');
    expect(hookForm({ ...SEEK, rated: false }).get('mode')).toBe('0');
  });

  it("posts the seek for the socket's sri, as an XHR, and says whether it's in", async () => {
    answer(new Response(null, { status: 200 }));
    expect(await postHook('ab/c', SEEK)).toBe(true);
    const [request] = requests;
    expect(request?.path).toBe('/setup/hook/ab%2Fc');
    expect(request?.init?.method).toBe('POST');
    expect(request?.init?.headers).toEqual({ 'X-Requested-With': 'XMLHttpRequest' });
    expect(request?.init?.body).toEqual(hookForm(SEEK));
  });

  it('posts a seek like a game, with no form', async () => {
    answer(new Response(null, { status: 200 }));
    expect(await postHookLike('abc', 'abcd1234')).toBe(true);
    expect(requests.map(({ path }) => path)).toEqual(['/setup/hook/abc/like/abcd1234']);
    expect(requests[0]?.init?.body).toBeUndefined();
  });

  it('fails when Lichess refuses it or cannot be reached', async () => {
    answer(new Response(null, { status: 400 }));
    expect(await postHook('abc', SEEK)).toBe(false);
    answer(new Error('offline'));
    expect(await postHook('abc', SEEK)).toBe(false);
  });

  it("falls back on Lichess's game setup with the seek filled in", () => {
    const url = new URL(setupUrl(SEEK), 'https://lichess.org');
    expect(url.pathname).toBe('/');
    expect(url.hash).toBe('#hook');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      variant: 'crazyhouse',
      time: 'realTime',
      minutesPerSide: '0.5',
      increment: '2',
      gameMode: 'rated',
    });
    expect(
      new URL(setupUrl({ ...SEEK, rated: false }), 'https://lichess.org').searchParams.get(
        'gameMode',
      ),
    ).toBe('casual');
  });
});
