import { describe, expect, it } from 'vitest';
import { Embeds, embedUrls } from './images.ts';

describe('the images a picture of the board holds', () => {
  it('go in as data, and those still to load are noted and left out meanwhile', () => {
    const embeds = new Embeds();
    const value =
      'url("https://lichess1.org/assets/piece/cburnett/wN.svg"), url(data:image/png;base64,AA==)';
    expect(embedUrls(value, embeds)).toBe('none, url("data:image/png;base64,AA==")');
    expect(embeds.complete).toBe(false);
  });

  it('keep a reference into the document as it is', () => {
    const embeds = new Embeds();
    expect(embedUrls('url(#ln-ext-black-pieces)', embeds)).toBe('url(#ln-ext-black-pieces)');
    expect(embeds.complete).toBe(true);
  });
});
