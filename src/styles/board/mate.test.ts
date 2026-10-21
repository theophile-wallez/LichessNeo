import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createShapeDrawer } from '#page/board/draw.ts';
import { renderBoard } from '#page/board/fixtures/board-markup.ts';

const SCHOLAR_MATE = {
  id: 'Ab',
  ply: 7,
  fen: 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4',
  san: 'Qxf7#',
  children: [],
};

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.documentElement.className = '';
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe('the checkmate', () => {
  // The badge's layer takes no clicks: the flag the board puts on <html> must not share its class.
  it('leaves the page clickable on a mate', () => {
    const style = document.createElement('style');
    style.textContent = readFileSync(join(import.meta.dirname, 'mate.css'), 'utf8');
    document.head.append(style);
    Object.assign(window, { site: { analysis: { node: SCHOLAR_MATE } } });
    renderBoard({ orientation: 'white' });
    createShapeDrawer({ mateLabel: 'Checkmate' })();
    const root = getComputedStyle(document.documentElement);
    expect(document.querySelector('#ln-ext-mate .ln-ext-mate__crown')).not.toBeNull();
    expect(root.pointerEvents).not.toBe('none');
    expect(root.position).not.toBe('absolute');
  });
});
