import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rules (ui/round/css/_table.scss), with its colors inlined, and the
// one its one-column layout hides the opponent's countdown with (_app-layout.scss).
const LICHESS_RULE =
  '.expiration { display: flex; align-items: center; justify-content: center;' +
  ' font-size: 0.9rem; line-height: 2; background: #759900; color: #fff; }' +
  '.expiration.emerg { background: #cc3333; }' +
  '.expiration strong { font-size: 1rem; margin-inline-end: 0.3em; }' +
  '@media (max-width: 799.98px) { .round__app .expiration-top { display: none } }';

// The palette's hues, which the pill tints itself with (styles/theme/palette.css).
const PALETTE = ':root { --ln-ext-orange: #ffb86c; --ln-ext-red: #ff5555; }';

const SHEETS = ['layout.css', 'zen.css', 'layout-narrow.css'];

const COUNTDOWN = (side: string, extra: string): string =>
  `<main class="round"><div class="round__app"><div class="expiration expiration-${side} ${extra}">` +
  '<strong>18</strong> seconds to play the first move</div></div></main>';

interface Countdown {
  /** The classes Lichess adds: `bar-glider` on the player's own turn, `emerg` under 8s. */
  readonly extra?: string;
  readonly side?: 'top' | 'bottom';
  readonly width?: number;
  readonly zen?: boolean;
}

/** The countdown at a window width, as a browser would lay it out. */
function render({
  extra = '',
  side = 'bottom',
  width = 1280,
  zen = false,
}: Countdown): HTMLElement {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = [
    LICHESS_RULE,
    PALETTE,
    ...SHEETS.map(sheet => readFileSync(join(import.meta.dirname, sheet), 'utf8')),
  ].join('\n');
  document.head.append(style);
  document.body.className = zen ? 'zenable zen' : '';
  document.body.innerHTML = COUNTDOWN(side, extra);
  const countdown = queryOne(document, '.expiration', HTMLElement);
  if (!countdown) throw new Error('no countdown');
  return countdown;
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.body.className = '';
});

describe('the first-move countdown', () => {
  // happy-dom drops a `color-mix()` it can't parse, so the fill itself can't be
  // read here: the hue it is mixed from, and the text in it, stand for it.
  it('tints itself instead of taking Lichess’s flat green', () => {
    const style = getComputedStyle(render({ extra: 'bar-glider' }));
    expect(style.getPropertyValue('--ln-ext-expiration')).toBe('#ffb86c');
    expect(style.color).toBe('#ffb86c');
  });

  it('turns red once the countdown is urgent', () => {
    const style = getComputedStyle(render({ extra: 'bar-glider emerg' }));
    expect(style.getPropertyValue('--ln-ext-expiration')).toBe('#ff5555');
    expect(style.color).toBe('#ff5555');
  });

  it('is a pill in the captured pieces’ row, not a bar across the whole bar', () => {
    const style = getComputedStyle(render({}));
    expect(style.justifySelf).toBe('start');
    expect(style.height).toBe('18px');
    expect(style.borderRadius).toBe('999px');
  });

  // Our narrow layout keeps the opponent's bar, which Lichess's one column drops.
  it('shows the opponent’s too, where Lichess hides it', () => {
    expect(getComputedStyle(render({ side: 'top', width: 768 })).display).toBe('flex');
    expect(getComputedStyle(render({ side: 'top', width: 390 })).display).toBe('flex');
  });

  it('keeps its count alone on a phone, where the words wouldn’t fit', () => {
    const countdown = render({ extra: 'bar-glider', width: 390 });
    const count = queryOne(countdown, 'strong', HTMLElement);
    if (!count) throw new Error('no count');
    expect(getComputedStyle(countdown).fontSize).toBe('0px');
    expect(getComputedStyle(count).fontSize).toBe('12px');
  });

  // Zen's bars are a column beside the board, the clock filling its width.
  it('keeps its count alone beside Zen’s clock, at the column’s end', () => {
    const style = getComputedStyle(render({ extra: 'bar-glider', zen: true }));
    expect(style.fontSize).toBe('0px');
    expect(style.justifySelf).toBe('end');
  });
});

/** Lichess's clock bar's style, under its own rule and ours. */
function clockBar(): CSSStyleDeclaration {
  const style = document.createElement('style');
  style.textContent =
    '.rclock .bar { display: block; height: 3px; }' +
    readFileSync(join(import.meta.dirname, 'layout.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML =
    '<main class="round"><div class="rclock rclock-bottom running">' +
    '<div class="time">2:29</div><div class="bar"></div></div></main>';
  const bar = queryOne(document, '.bar', HTMLElement);
  if (!bar) throw new Error('no bar');
  return getComputedStyle(bar);
}

describe('Lichess’s clock bar', () => {
  afterEach(() => {
    delete document.documentElement.dataset.lnExtClockBar;
  });

  // Lichess animates the bar's transform through each move, hidden or not: with no box, the
  // animation can't go to the compositor, and Chrome restyled the page on every frame.
  it('keeps a box, out of sight, so its animation stays off the main thread', () => {
    const barStyle = clockBar();
    expect(barStyle.display).not.toBe('none');
    expect(barStyle.position).toBe('absolute');
    expect(barStyle.width).toBe('1px');
    expect(barStyle.opacity).toBe('0');
  });

  it('shows as a strip along the clock once picked (content/clock-bar)', () => {
    document.documentElement.dataset.lnExtClockBar = '';
    const barStyle = clockBar();
    expect(barStyle.position).toBe('absolute');
    expect([barStyle.width, barStyle.height]).toEqual(['124px', '3px']);
    expect(barStyle.opacity).toBe('0.5');
  });
});
