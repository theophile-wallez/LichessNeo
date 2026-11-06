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

function layer(dimension: 'is2d' | 'is3d'): CSSStyleDeclaration {
  const style = document.createElement('style');
  style.textContent = readFileSync(join(import.meta.dirname, 'mate.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML =
    `<div id="main-wrap" class="${dimension}"><div id="ln-ext-mate">` +
    '<div class="ln-ext-mate"></div></div></div>';
  const element = document.querySelector('.ln-ext-mate');
  if (!(element instanceof HTMLElement)) throw new Error('no mate');
  return getComputedStyle(element);
}

describe('the checkmate on a 3D board', () => {
  // Its squares are 464.5/512 as tall as wide: counted square, the "#" fell half a square low.
  it('counts its ranks as tall as its squares are', () => {
    expect(layer('is2d').getPropertyValue('--ln-ext-mate-rank').trim()).toBe('12.5cqw');
    expect(layer('is3d').getPropertyValue('--ln-ext-mate-rank')).toContain('464.5');
  });

  it('stands over its near pieces', () => {
    layer('is3d');
    const mate = document.querySelector('#ln-ext-mate');
    if (!(mate instanceof HTMLElement)) throw new Error('no layer');
    expect(Number(getComputedStyle(mate).zIndex)).toBeGreaterThanOrEqual(10);
  });
});
