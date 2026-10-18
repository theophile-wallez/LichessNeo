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
