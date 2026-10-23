import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { trackListeners } from '#shared/testing/listeners.ts';
import { roundness } from './index.ts';

let fetchPref: Mock<typeof fetch>;
let stopListening = (): void => {};

const receive = (radius: number): void => {
  window.dispatchEvent(
    new MessageEvent('message', { data: { type: 'ln-ext:roundness', radius }, source: window }),
  );
};

const posted = (): (string | null)[] =>
  fetchPref.mock.calls.map(([url, init]) =>
    typeof url === 'string' && init?.body instanceof URLSearchParams
      ? `${url} ${init.body.toString()}`
      : null,
  );

beforeEach(() => {
  vi.useFakeTimers();
  fetchPref = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 200 })));
  vi.stubGlobal('fetch', fetchPref);
  stopListening = trackListeners(window);
  roundness.start();
});

afterEach(() => {
  stopListening();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the Roundness set in the settings', () => {
  it('is saved as Lichess’s pref once the slider rests a second, as its own menu saves it', () => {
    receive(3);
    vi.advanceTimersByTime(600);
    receive(11);
    vi.advanceTimersByTime(999);
    expect(posted()).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(posted()).toEqual(['/pref/uiRoundness uiRoundness=11']);
  });

  it('isn’t saved out of Lichess’s range', () => {
    receive(16);
    vi.advanceTimersByTime(1000);
    expect(posted()).toEqual([]);
  });
});
