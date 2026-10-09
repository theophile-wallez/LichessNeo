import { describe, expect, it } from 'vitest';
import { avatarOf } from '#shared/avatar.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { introBoardImage, introMarkup } from './markup.ts';
import type { BarPlayer } from '#shared/player-bar.ts';

const player = (name: string, extra: Partial<BarPlayer> = {}): BarPlayer => ({
  name,
  user: undefined,
  title: undefined,
  rating: undefined,
  flag: undefined,
  computer: false,
  ...extra,
});

function render(top: BarPlayer, bottom: BarPlayer): HTMLElement {
  const root = document.createElement('div');
  setHtml(root, introMarkup({ top, bottom }));
  return root;
}

describe('introMarkup', () => {
  it('puts the top player’s card on the dropped board and the bottom one’s on the board', () => {
    const root = render(
      player('Stockfish level 1', { rating: '~400', computer: true }),
      player('alice', { title: 'IM', rating: '2400', flag: '🇫🇷' }),
    );
    const top = queryOne(root, '.lr-ext-intro__drop > .lr-ext-intro__card--top', HTMLElement);
    const bottom = queryOne(root, '.lr-ext-intro__stay > .lr-ext-intro__card--bottom', HTMLElement);
    expect(top?.classList.contains('lr-ext-intro__card--computer')).toBe(true);
    expect(top?.querySelector('.lr-ext-intro__details')?.textContent).toBe('~400');
    expect(bottom?.classList.contains('lr-ext-intro__card--computer')).toBe(false);
    expect(bottom?.querySelector('.lr-ext-intro__title')?.textContent).toBe('IM');
    expect(bottom?.querySelector('.lr-ext-intro__username')?.textContent).toBe('alice');
    expect(bottom?.querySelector('.lr-ext-intro__details')?.textContent).toBe('2400 🇫🇷');
    expect(
      root.querySelector('.lr-ext-intro__vs > .lr-ext-intro__swords + .lr-ext-intro__versus')
        ?.textContent,
    ).toBe('VS');
  });

  it('gives a user their avatar, and the computer none', () => {
    const root = render(
      player('Stockfish level 1', { computer: true }),
      player('alice', { user: 'alice' }),
    );
    const [top, bottom] = queryAll(root, '.lr-ext-intro__avatar', HTMLElement);
    expect(top?.dataset.lrExtAvatarCoach).toBeUndefined();
    const { coach, color } = avatarOf('alice');
    expect([bottom?.dataset.lrExtAvatarCoach, bottom?.dataset.lrExtAvatarColor]).toEqual([
      String(coach),
      color,
    ]);
  });

  it('leaves out what a player lacks, and escapes names', () => {
    const root = render(player('<b>x</b>'), player('Anonymous'));
    expect(queryAll(root, '.lr-ext-intro__title, .lr-ext-intro__details', HTMLElement)).toEqual([]);
    expect(root.querySelector('b')).toBeNull();
    expect(root.querySelector('.lr-ext-intro__username')?.textContent).toBe('<b>x</b>');
  });
});

const svgOf = (image: string): string =>
  decodeURIComponent(/^url\("data:image\/svg\+xml,(.*)"\)$/.exec(image)?.[1] ?? '');
const colorsOf = (image: string): string[] =>
  [...svgOf(image).matchAll(/fill="(#[\da-f]{6})"/g)].map(match => match[1] ?? '');

describe('introBoardImage', () => {
  it('draws an 8×8 board, its 32 dark squares in one path', () => {
    const svg = svgOf(introBoardImage(() => 0));
    expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 8 8"/);
    expect(svg.match(/h1v1h-1z/g)).toHaveLength(32);
    // a8 is light, b8 dark.
    expect(svg).not.toContain('M0 0h1');
    expect(svg).toContain('M1 0h1');
  });

  it('picks its colors with `random`, from the first pair to the last', () => {
    const first = colorsOf(introBoardImage(() => 0));
    const last = colorsOf(introBoardImage(() => 0.999_999));
    expect(first).toHaveLength(2);
    expect(last).toHaveLength(2);
    expect(last).not.toEqual(first);
  });
});
