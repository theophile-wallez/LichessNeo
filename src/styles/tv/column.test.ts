import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { cssPixels, cssTracks, type Viewport } from '#shared/testing/css-math.ts';

const STYLES = join(import.meta.dirname, '..');
const SHEETS = [
  'sidebar/layout.css',
  'game/layout.css',
  'game/board-extras.css',
  'game/zen.css',
  'tv/column.css',
];

const GAP = 24;
/* The room layout.css keeps for the page's margins and the ranks' coordinates. */
const RESERVE = 48;

const TV =
  '<div id="main-wrap"><main class="round tv-single"><div class="round__app"></div>' +
  '<div class="round__side"><div class="subnav"><div class="subnav__inner">' +
  '<a class="tv-channel active"><span><span><strong>Blitz</strong></span></span></a>' +
  '</div></div></div></main></div>';

interface Layout {
  /** The grid's tracks, in pixels, left to right. */
  readonly tracks: readonly number[];
  /** What the window leaves beside the sidebar. */
  readonly room: number;
}

/** TV's grid at a window size, as a browser would lay it out. */
function layoutAt(viewport: Viewport, flags = 'round tv-channels', bodyClass = ''): Layout {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', viewport.width);
  Reflect.set(window, 'innerHeight', viewport.height);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet => readFileSync(join(STYLES, sheet), 'utf8')).join('\n');
  document.head.replaceChildren(style);
  document.documentElement.dataset['lnExtHas'] = flags;
  document.body.className = bodyClass;
  document.body.innerHTML = TV;
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) throw new Error('no main');
  return {
    tracks: cssTracks(getComputedStyle(main).gridTemplateColumns, viewport),
    room: cssPixels(getComputedStyle(document.body).getPropertyValue('--ln-ext-main-w'), viewport),
  };
}

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
  document.body.className = '';
  delete document.documentElement.dataset['lnExtHas'];
});

describe('TV’s columns', () => {
  // The board is as tall as the window allows and no wider, so a window wider than it is
  // tall leaves width over, which used to go to the page's margins.
  it('gives the width the board leaves to the channels and the panel', () => {
    const viewport = { width: 1440, height: 780 };
    const { tracks, room } = layoutAt(viewport);
    const [channels = 0, board = 0, panel = 0] = tracks;
    const gameBoard = layoutAt(viewport, 'round').tracks[0];

    expect(board).toBe(gameBoard);
    expect(channels).toBeGreaterThan(220);
    expect(panel).toBeGreaterThan(310);
    expect(channels + board + panel + 2 * GAP).toBeCloseTo(room - RESERVE, 6);
  });

  it('holds both columns at their widest on a wide window', () => {
    const [channels, , panel] = layoutAt({ width: 2560, height: 1440 }).tracks;

    expect(channels).toBe(250);
    expect(panel).toBe(360);
  });

  it('leaves the columns alone where the window’s width caps the board', () => {
    const viewport = { width: 1024, height: 768 };
    const { tracks, room } = layoutAt(viewport);
    const [channels = 0, board = 0, panel = 0] = tracks;

    expect([channels, panel]).toEqual([62, 260]);
    expect(channels + board + panel + 2 * GAP).toBeLessThanOrEqual(room - RESERVE);
  });

  // Zen sizes its own board from the window, so there is nothing to hand out there.
  it('hands nothing out in zen mode', () => {
    const viewport = { width: 1440, height: 780 };
    const zen = layoutAt(viewport, 'round tv-channels', 'zenable zen');
    const [channels = 0, , panel = 0] = zen.tracks;

    expect(channels).toBe(0);
    expect(panel).toBe(cssPixels('clamp(260px, 20vw, 360px)', viewport));
  });

  // Crazyhouse: the pockets sit between the board and the panel, and the grid carries its
  // own gaps, so the leftover width must count the pockets' room too or the page overflows.
  it('fits the pockets’ room on a crazyhouse channel', () => {
    for (const viewport of [
      { width: 1440, height: 780 },
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
    ]) {
      const { tracks, room } = layoutAt(viewport, 'round tv-channels pocket');
      const used = tracks.reduce((total, track) => total + track, 0);

      expect(tracks).toHaveLength(4);
      expect(used).toBeLessThanOrEqual(room - RESERVE);
    }
  });
});
