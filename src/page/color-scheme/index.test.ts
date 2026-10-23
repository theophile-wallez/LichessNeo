import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { trackListeners } from '#shared/testing/listeners.ts';
import { colorScheme } from './index.ts';

let fetchPref: Mock<typeof fetch>;
let stopListening = (): void => {};

const receive = (scheme: string): void => {
  window.dispatchEvent(
    new MessageEvent('message', { data: { type: 'ln-ext:color-scheme', scheme }, source: window }),
  );
};

const posted = (): (string | null)[] =>
  fetchPref.mock.calls.map(([url, init]) =>
    typeof url === 'string' && init?.body instanceof URLSearchParams
      ? `${url} ${init.body.toString()}`
      : null,
  );

beforeEach(() => {
  fetchPref = vi.fn<typeof fetch>(() => Promise.resolve(new Response(null, { status: 200 })));
  vi.stubGlobal('fetch', fetchPref);
  stopListening = trackListeners(window);
  colorScheme.start();
});

afterEach(() => {
  stopListening();
  vi.unstubAllGlobals();
  document.documentElement.className = '';
  delete document.body.dataset.theme;
});

describe('the color scheme picked in the settings', () => {
  it('shows on the page at once, and is saved as Lichess’s pref', () => {
    document.documentElement.className = 'dark is-rtl';
    receive('light');
    expect(document.documentElement.className).toBe('is-rtl light');
    expect(document.body.dataset.theme).toBe('light');
    expect(posted()).toEqual(['/pref/bg bg=light']);
  });

  it('turns Lichess’s background picture off, which the extension leaves out', () => {
    document.documentElement.className = 'transp dark';
    receive('dark');
    expect(document.documentElement.className).toBe('dark');
    expect(posted()).toEqual(['/pref/bg bg=dark']);
  });
});
