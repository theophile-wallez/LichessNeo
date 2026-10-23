import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { cssPixels, type Viewport } from '#shared/testing/css-math.ts';

const SHEETS = ['layout.css', 'header.css'];

interface Room {
  readonly sidebar: number;
  readonly header: number;
  /** What the window leaves to a page that fits it. */
  readonly width: number;
  readonly height: number;
  /** The window's height less what Lichess sizes Storm's and Learn's boards from. */
  readonly lichessRoom: number;
}

/** The room the nav leaves the page, as a browser would lay it out. */
function roomAt(viewport: Viewport, shape?: string, bodyClass = ''): Room {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', viewport.width);
  Reflect.set(window, 'innerHeight', viewport.height);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet =>
    readFileSync(join(import.meta.dirname, sheet), 'utf8'),
  ).join('\n');
  document.head.replaceChildren(style);
  if (shape) document.documentElement.dataset.lnExtSidebar = shape;
  else delete document.documentElement.dataset.lnExtSidebar;
  document.body.className = bodyClass;
  document.body.innerHTML = '<header id="top"></header><div id="main-wrap"></div>';
  const wrap = queryOne(document, '#main-wrap', HTMLElement);
  if (!wrap) throw new Error('no #main-wrap');
  const body = getComputedStyle(document.body);
  const length = (name: string, fallback: string): number =>
    cssPixels(body.getPropertyValue(name) || fallback, viewport);
  return {
    sidebar: cssPixels(
      getComputedStyle(document.documentElement).getPropertyValue('--ln-ext-sidebar-w') || '0px',
      viewport,
    ),
    header: cssPixels(getComputedStyle(wrap).marginTop || '0px', viewport),
    width: length('--ln-ext-main-w', '100vw'),
    height: length('--ln-ext-main-h', '100dvh'),
    lichessRoom: viewport.height - length('---site-header-height', '0px'),
  };
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
  document.body.className = '';
  delete document.documentElement.dataset.lnExtSidebar;
});

describe('the header', () => {
  const desktop = { width: 1440, height: 900 };

  it('gives the page the whole width and the height under it', () => {
    const room = roomAt(desktop, 'header');
    expect(room.sidebar).toBe(0);
    expect(room.header).toBe(56);
    expect(room.width).toBe(1440);
    expect(room.height).toBe(844);
  });

  it('leaves Lichess’s boards what they leave beside the sidebar, less the bar', () => {
    expect(roomAt(desktop, 'header').lichessRoom).toBe(roomAt(desktop).lichessRoom - 56);
  });

  it('gives the whole window back in Zen mode', () => {
    expect(roomAt(desktop, 'header', 'zenable zen').height).toBe(900);
  });

  it('leaves the sidebar as it was otherwise', () => {
    const room = roomAt(desktop);
    expect(room.sidebar).toBe(168);
    expect(room.header).toBe(0);
    expect(room.width).toBe(1440 - 168);
  });

  it('leaves Lichess’s own header below 1020px', () => {
    const room = roomAt({ width: 1019, height: 768 }, 'header');
    expect(room.header).toBe(0);
    expect(room.width).toBe(1019);
  });
});
