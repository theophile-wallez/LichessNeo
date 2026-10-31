import { afterEach, describe, expect, it } from 'vitest';
import { pieceUrls, wholePieceUrl, wholeUrlRule } from './piece-urls.ts';

const BASE = 'https://lichess.org/tv';
const KNIGHT = 'url(/assets/hashed/wN.43d8bed9.svg)';
const WHOLE_KNIGHT = 'url(https://lichess.org/assets/hashed/wN.43d8bed9.svg)';
const knightOnly = (name: string): string => (name === '---white-knight' ? KNIGHT : '');
// What a path is on the test's page.
const onPage = (path: string): string => `url(${new URL(path, document.baseURI).href})`;

describe('wholePieceUrl', () => {
  it('makes a path whole against the page, unquoted', () => {
    expect(wholePieceUrl(KNIGHT, BASE)).toBe(WHOLE_KNIGHT);
    expect(wholePieceUrl(` url("/assets/hashed/wN.43d8bed9.svg") `, BASE)).toBe(WHOLE_KNIGHT);
    expect(wholePieceUrl('url(piece/cburnett/wN.svg)', 'https://lichess.org/assets/')).toBe(
      'url(https://lichess.org/assets/piece/cburnett/wN.svg)',
    );
  });

  it('leaves whole URLs, a pack’s data: URLs and other values alone', () => {
    expect(wholePieceUrl(WHOLE_KNIGHT, BASE)).toBeNull();
    expect(wholePieceUrl('url(data:image/svg+xml;base64,PHN2Zy8+)', BASE)).toBeNull();
    expect(wholePieceUrl('url(chrome-extension://abc/img/pieces/wN.webp)', BASE)).toBeNull();
    expect(wholePieceUrl('', BASE)).toBeNull();
    expect(wholePieceUrl('none', BASE)).toBeNull();
  });
});

describe('wholeUrlRule', () => {
  it('gives each variable declared as a path its whole URL', () => {
    expect(wholeUrlRule(knightOnly, BASE)).toBe(`:root{---white-knight:${WHOLE_KNIGHT}}`);
  });

  it('is empty when nothing needs it', () => {
    expect(wholeUrlRule(() => WHOLE_KNIGHT, BASE)).toBe('');
  });
});

describe('pieceUrls', () => {
  afterEach(() => {
    for (const style of document.head.querySelectorAll('style')) style.remove();
    document.body.removeAttribute('style');
  });

  it('writes Lichess’s variables again as whole URLs, on :root and on <body>', async () => {
    const lichess = document.createElement('style');
    lichess.textContent = `:root{---white-knight:${KNIGHT}}`;
    document.head.append(lichess);
    pieceUrls.start();
    const rule = document.querySelector('style#ln-ext-piece-urls')?.textContent;
    expect(rule).toBe(`:root{---white-knight:${onPage('/assets/hashed/wN.43d8bed9.svg')}}`);

    // As Lichess's menu does once the set changes.
    document.body.style.setProperty('---black-pawn', 'url(/assets/hashed/bP.93e11e46.svg)');
    await expect
      .poll(() => document.body.style.getPropertyValue('---black-pawn'))
      .toBe(onPage('/assets/hashed/bP.93e11e46.svg'));
  });
});
