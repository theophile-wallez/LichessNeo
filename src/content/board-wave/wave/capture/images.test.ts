import { afterEach, describe, expect, it, vi } from 'vitest';
import { Embeds, embedUrls } from './images.ts';

const PIECE = 'https://lichess1.org/assets/piece/cburnett/wN.svg';
const LOST = 'https://lichess1.org/assets/piece/cburnett/lost.svg';

describe('the images a picture of the board holds', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('go in as data, those still to load as marks filled in once loaded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          url === PIECE
            ? new Response(new Blob(['<svg/>'], { type: 'image/svg+xml' }))
            : new Response(null, { status: 404 }),
        ),
      ),
    );
    const embeds = new Embeds();
    const written = embedUrls(`url("${PIECE}"), url(data:image/png;base64,AA==)`, embeds);
    expect(written).not.toContain(PIECE);
    expect(written).toContain('url("data:image/png;base64,AA==")');
    const filled = await embeds.fill(`<div style='background:${written}'></div>`);
    expect(filled).toContain(`url("data:image/svg+xml;base64,${btoa('<svg/>')}")`);
    expect(filled).not.toContain('ln-ext-embed');
  });

  it('leave an image that cannot be read clear', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('blocked'))),
    );
    // Nor can it be drawn: the image errors at once.
    vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(function (
      this: HTMLImageElement,
    ) {
      queueMicrotask(() => this.dispatchEvent(new Event('error')));
    });
    const embeds = new Embeds();
    const written = embedUrls(`url("${LOST}")`, embeds);
    const filled = await embeds.fill(written);
    expect(filled).toMatch(/^url\("data:image\/gif;base64,[^"]+"\)$/);
    // Once known unreadable, it's left out at once.
    expect(embedUrls(`url("${LOST}")`, new Embeds())).toBe('none');
    vi.restoreAllMocks();
  });

  it('keep a reference into the document as it is', async () => {
    const embeds = new Embeds();
    expect(embedUrls('url(#ln-ext-black-pieces)', embeds)).toBe('url(#ln-ext-black-pieces)');
    await expect(embeds.fill('kept')).resolves.toBe('kept');
  });
});
