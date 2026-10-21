import { afterEach, describe, expect, it, vi } from 'vitest';
import { withPieceGlyphs } from '#shared/testing/piece-glyphs.ts';
import { flush } from '#shared/testing/timers.ts';
import { createCapturedSync } from './captured.ts';
import { capturedMarkup, type MaterialPiece } from './material.ts';
// What the original script drew for each board.
import legacy from './fixtures/legacy-captured.json' with { type: 'json' };

const inner = (selector: string): string | null =>
  document.querySelector(selector)?.innerHTML ?? null;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('captured pieces', () => {
  it.each(legacy.scenarios)('draws what the original drew: $name', scenario => {
    const sync = createCapturedSync();
    document.body.innerHTML = scenario.html;
    sync();
    expect(inner('.ln-ext-captured--top')).toBe(withPieceGlyphs(scenario.top));
    expect(inner('.ln-ext-captured--bottom')).toBe(withPieceGlyphs(scenario.bottom));
  });

  it('leaves the bars alone while the board is the same', () => {
    const sync = createCapturedSync();
    const [scenario] = legacy.scenarios;
    document.body.innerHTML = scenario?.html ?? '';
    sync();
    const group = document.querySelector('.ln-ext-captured--top > .ln-ext-captured__group');
    sync();
    expect(document.querySelector('.ln-ext-captured--top > .ln-ext-captured__group')).toBe(group);
    expect(document.querySelectorAll('.ln-ext-captured')).toHaveLength(2);
  });

  it('reads the board again only once it changes', async () => {
    const sync = createCapturedSync();
    const scenario = legacy.scenarios.find(each => each.html.includes('piece'));
    document.body.innerHTML = scenario?.html ?? '';
    sync();
    const reads = vi.spyOn(Element.prototype, 'querySelectorAll');
    sync();
    expect(reads).not.toHaveBeenCalled();
    const before = inner('.ln-ext-captured--top') ?? '';
    for (const piece of document.querySelectorAll('cg-board piece')) piece.remove();
    await flush();
    sync();
    expect(inner('.ln-ext-captured--top')).not.toBe(before);
  });

  it('draws again into new bars when Lichess replaces <main>', () => {
    const sync = createCapturedSync();
    const [scenario] = legacy.scenarios;
    document.body.innerHTML = scenario?.html ?? '';
    sync();
    document.body.innerHTML = scenario?.html ?? '';
    sync();
    expect(inner('.ln-ext-captured--top')).toBe(withPieceGlyphs(scenario?.top ?? ''));
  });
});

// A broadcast's board, with Lichess's bars or not yet.
const pieces = '<piece class="white queen"></piece><piece class="black rook"></piece>';
const bar = (side: string): string =>
  `<div class="relay-board-player relay-board-player-${side}"><div class="left"></div>` +
  `<div class="material"></div><div class="analyse__clock"></div></div>`;
const page = (bars: string, extra = ''): string =>
  `<main class="analyse is-relay"><div class="analyse__board main-board">` +
  `<div class="cg-wrap orientation-white"><cg-container><cg-board>${pieces}</cg-board>` +
  `</cg-container></div>${bars}</div>${extra}</main>`;

describe('captured pieces in Lichess’s bars', () => {
  it('draws a broadcast’s rows in its bars', () => {
    const sync = createCapturedSync();
    document.body.innerHTML = page(bar('top') + bar('bot'));
    sync();
    const top = document.querySelector('.relay-board-player-top > .ln-ext-captured--top');
    const bottom = document.querySelector('.relay-board-player-bot > .ln-ext-captured--bottom');
    // White, at the bottom, kept its queen and Black its rook.
    expect(top?.querySelectorAll('.ln-ext-pc-wq')).toHaveLength(0);
    expect(top?.querySelector('.ln-ext-captured__score')).toBeNull();
    expect(bottom?.querySelectorAll('.ln-ext-pc-br')).toHaveLength(1);
    expect(bottom?.querySelector('.ln-ext-captured__score')?.textContent).toBe('+4');
    expect(document.querySelectorAll('main > .ln-ext-captured')).toHaveLength(0);
  });

  it('moves the rows into the bars a study’s chapter gains', async () => {
    const sync = createCapturedSync();
    document.body.innerHTML = page('');
    sync();
    expect(document.querySelectorAll('main > .ln-ext-captured')).toHaveLength(2);
    document
      .querySelector('.analyse__board')
      ?.insertAdjacentHTML('beforeend', bar('top') + bar('bot'));
    await flush();
    sync();
    expect(document.querySelectorAll('main > .ln-ext-captured')).toHaveLength(0);
    expect(document.querySelectorAll('.relay-board-player > .ln-ext-captured')).toHaveLength(2);
  });

  it('takes the rows off a practice lesson', () => {
    const sync = createCapturedSync();
    document.body.innerHTML = page('', '<div class="ln-ext-player"></div>');
    sync();
    expect(document.querySelectorAll('.ln-ext-captured')).toHaveLength(2);
    document
      .querySelector('main')
      ?.insertAdjacentHTML('beforeend', '<div class="practice__side"></div>');
    sync();
    expect(document.querySelectorAll('.ln-ext-captured')).toHaveLength(0);
  });
});

describe('capturedMarkup', () => {
  const pawn: MaterialPiece = { color: 'white', role: 'pawn' };
  it('shows three-check kings after the pieces, and the lead last', () => {
    const markup = capturedMarkup({
      pieces: [pawn],
      bottom: 'white',
      variant: 'threeCheck',
      checks: { top: 0, bottom: 2 },
    });
    expect(markup.bottom.value).toMatch(/ln-ext-pc-bk.*ln-ext-pc-bk.*ln-ext-captured__score">\+1</);
  });
});
