import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from '#shared/dom.ts';
import { copyAvatar, readSetup } from './stage.ts';

const main = (setup: string): HTMLElement => {
  const element = document.createElement('main');
  element.innerHTML = `<div class="game__meta__infos" data-icon="\u{e008}"><div class="header">${setup}</div></div>`;
  return element;
};

describe('the game’s setup, for the intros', () => {
  it('reads the info’s line as Lichess writes it', () => {
    expect(
      readSetup(main('<div class="setup">3+2 • Rated • <a href="/blitz">Blitz</a></div>')),
    ).toEqual({
      icon: '\u{e008}',
      parts: ['3+2', 'Rated', 'Blitz'],
    });
  });

  it('reads it once split into spans (content/game/game-meta.ts)', () => {
    const split =
      '<div class="setup" data-ln-ext-parts=""><span class="ln-ext-part">3+2</span>' +
      '<span class="ln-ext-part">Casual</span><a href="/blitz">Blitz</a></div>';
    expect(readSetup(main(split)).parts).toEqual(['3+2', 'Casual', 'Blitz']);
  });

  it('has nothing to say where there’s no info', () => {
    expect(readSetup(document.createElement('main'))).toEqual({ icon: undefined, parts: [] });
  });
});

describe('a bar’s avatar, copied for the intros', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the silhouette’s tile, the color under its image', () => {
    // happy-dom computes no pseudo-element: the bar's `::before` as Chrome reads it.
    const avatar = createElement('div').style;
    avatar.backgroundColor = 'rgb(66, 66, 70)';
    avatar.backgroundImage = 'url("silhouette.svg")';
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(avatar);
    const bar = createElement('div');
    const copy = createElement('div');
    copyAvatar(copy, {
      bar,
      avatar: { x: 0, y: 0, width: 40, height: 40 },
      player: {
        name: 'Anonymous',
        user: undefined,
        title: undefined,
        rating: undefined,
        flag: undefined,
        computer: false,
      },
      color: 'white',
    });
    expect(copy.style.getPropertyValue('--ln-ext-intro-avatar-color')).toBe('rgb(66, 66, 70)');
    expect(copy.style.getPropertyValue('--ln-ext-intro-avatar-image')).toBe(
      'url("silhouette.svg")',
    );
  });
});
