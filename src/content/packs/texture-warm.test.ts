import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const asked: string[] = [];

beforeEach(() => {
  vi.resetModules();
  asked.length = 0;
  vi.stubGlobal('chrome', {
    runtime: { id: 'test', getURL: (path: string) => `chrome-extension://test/${path}` },
  });
  vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(function (url: string) {
    asked.push(url);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('warming a texture', () => {
  it('asks for its image once, before there is a board to paint it on', async () => {
    const { warmTexture } = await import('./texture-warm.ts');
    warmTexture('burl');
    warmTexture('burl');
    warmTexture('marble');
    expect(asked).toEqual([
      'chrome-extension://test/img/boards/burl.webp',
      'chrome-extension://test/img/boards/marble.webp',
    ]);
  });

  it('asks for nothing for a board without one', async () => {
    const { warmTexture } = await import('./texture-warm.ts');
    warmTexture(undefined);
    expect(asked).toEqual([]);
  });

  it('asks for nothing without the extension, as a unit test runs', async () => {
    vi.stubGlobal('chrome', undefined);
    const { warmTexture } = await import('./texture-warm.ts');
    warmTexture('burl');
    expect(asked).toEqual([]);
  });
});
