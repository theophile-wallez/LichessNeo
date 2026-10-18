import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_KEY_SHAPE, keyBox } from '#shared/backlit.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { keysImage, paintTiles, showKeys } from './backlit-keys.ts';

const root = document.documentElement;
const SLATE = {
  light: ['#5d6372', '#4e5361'],
  dark: ['#2f333d', '#262931'],
  frame: '#0c0d10',
  tint: '#dfe6ff',
} as const;

/** The SVG a CSS image of `keysImage` holds. */
function svgOf(image: string): Document {
  const prefix = 'url("data:image/svg+xml,';
  expect(image.startsWith(prefix) && image.endsWith('")')).toBe(true);
  return new DOMParser().parseFromString(
    decodeURIComponent(image.slice(prefix.length, -2)),
    'image/svg+xml',
  );
}

const keysOf = (svg: Document): Element[] => queryAll(svg, "rect[fill^='url(#']", Element);
const placeOf = (rect: Element | undefined): (string | null)[] =>
  ['x', 'y', 'width', 'rx', 'fill'].map(name => rect?.getAttribute(name) ?? null);
const frameOf = (image: string): string | null | undefined =>
  queryOne(svgOf(image), 'svg > rect', Element)?.getAttribute('fill');

afterEach(() => {
  root.removeAttribute('style');
  document.body.innerHTML = '';
  localStorage.clear();
});

describe('keysImage', () => {
  it('draws two squares by two on the frame, light at the top left, each key inset by half the gap', () => {
    const svg = svgOf(keysImage(SLATE, keyBox(DEFAULT_KEY_SHAPE)));
    expect(queryOne(svg, 'svg', Element)?.getAttribute('viewBox')).toBe('0 0 200 200');
    expect(frameOf(keysImage(SLATE, keyBox(DEFAULT_KEY_SHAPE)))).toBe('#0c0d10');
    expect(keysOf(svg).map(placeOf)).toEqual([
      ['2.75', '2.75', '94.5', '9.6', 'url(#l)'],
      ['102.75', '2.75', '94.5', '9.6', 'url(#d)'],
      ['2.75', '102.75', '94.5', '9.6', 'url(#d)'],
      ['102.75', '102.75', '94.5', '9.6', 'url(#l)'],
    ]);
    // Each key under its edge: lit on top, dark at the bottom.
    expect(queryAll(svg, "rect[stroke='url(#e)']", Element)).toHaveLength(4);
  });

  it('shades each kind of key top to bottom in its colors', () => {
    const svg = svgOf(keysImage(SLATE, keyBox(DEFAULT_KEY_SHAPE)));
    const stops = (id: string): (string | null)[] =>
      queryAll(svg, `linearGradient[id='${id}'] stop`, Element).map(stop =>
        stop.getAttribute('stop-color'),
      );
    expect(stops('l')).toEqual(['#5d6372', '#4e5361']);
    expect(stops('d')).toEqual(['#2f333d', '#262931']);
  });

  it('fills the square without a gap, and rounds a key no further than a circle', () => {
    const flush = svgOf(keysImage(SLATE, keyBox({ gap: 0, radius: 0 })));
    expect(placeOf(keysOf(flush)[1])).toEqual(['100', '0', '100', '0', 'url(#d)']);
    const round = svgOf(keysImage(SLATE, keyBox({ gap: 16, radius: 50 })));
    expect(placeOf(keysOf(round)[0])).toEqual(['8', '8', '84', '42', 'url(#l)']);
  });
});

describe('showKeys', () => {
  it('puts the board’s keys and light on <html>, for both schemes', () => {
    showKeys('backlit-forest', keyBox(DEFAULT_KEY_SHAPE));
    const style = root.style;
    expect(frameOf(style.getPropertyValue('--ln-ext-backlit-keys-dark'))).toBe('#0a100c');
    expect(frameOf(style.getPropertyValue('--ln-ext-backlit-keys-light'))).toBe('#7d9d85');
    expect(style.getPropertyValue('--ln-ext-backlit-tint-dark')).toBe('#8be9b0');
    expect(style.getPropertyValue('--ln-ext-backlit-tint-light')).toBe('#16904c');
  });

  it('gives the last move’s outline the keys’ shape, its corners a share of the key', () => {
    showKeys('backlit', keyBox({ gap: 0, radius: 25 }));
    expect(root.style.getPropertyValue('--ln-ext-backlit-inset')).toBe('0%');
    expect(root.style.getPropertyValue('--ln-ext-backlit-radius')).toBe('25%');
    showKeys('backlit', keyBox({ gap: 16, radius: 0 }));
    expect(root.style.getPropertyValue('--ln-ext-backlit-inset')).toBe('8%');
    expect(root.style.getPropertyValue('--ln-ext-backlit-radius')).toBe('0%');
  });
});

const tile = (theme: string): string =>
  `<button class="ln-ext-src-item"><span class="ln-ext-src-thumb" data-ln-ext-theme="${theme}"></span></button>`;
const thumb = (theme: string): HTMLElement => {
  const found = queryOne(document, `[data-ln-ext-theme="${theme}"]`, HTMLElement);
  if (!found) throw new Error(`no ${theme}`);
  return found;
};
const keys = (theme: string): string =>
  thumb(theme).style.getPropertyValue('--ln-ext-backlit-keys-dark');

describe('paintTiles', () => {
  it('paints the backlit tiles only, in the shape the settings give', () => {
    document.body.innerHTML = tile('backlit-walnut') + tile('backlit-neon') + tile('accent');
    localStorage.setItem('ln-ext-backlit-gap', '0');
    paintTiles();
    expect(frameOf(keys('backlit-walnut'))).toBe('#120c08');
    expect(placeOf(keysOf(svgOf(keys('backlit-walnut')))[0])).toEqual([
      '0',
      '0',
      '100',
      '9.6',
      'url(#l)',
    ]);
    expect(thumb('backlit-walnut').style.getPropertyValue('--ln-ext-backlit-tint-light')).toBe(
      '#d96c00',
    );
    expect(thumb('backlit-walnut').dataset.lnExtPainted).toBe('backlit-walnut 0 0.096');
    expect(thumb('backlit-neon').getAttribute('style')).toBeNull();
    expect(thumb('accent').getAttribute('style')).toBeNull();
  });

  it('leaves a tile already in the shape, and paints it again once the shape changes', () => {
    document.body.innerHTML = tile('backlit-panda');
    paintTiles(document.body);
    thumb('backlit-panda').removeAttribute('style');
    paintTiles(document.body);
    expect(keys('backlit-panda')).toBe('');
    localStorage.setItem('ln-ext-backlit-radius', '50');
    paintTiles(document.body);
    expect(thumb('backlit-panda').dataset.lnExtPainted).toBe('backlit-panda 0.0275 0.4725');
    expect(placeOf(keysOf(svgOf(keys('backlit-panda')))[0])?.[3]).toBe('47.25');
  });
});
