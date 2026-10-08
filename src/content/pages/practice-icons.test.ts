import { afterEach, describe, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';
import { absoluteIconUrl, syncPracticeIcons } from './practice-icons.ts';

const SHEET = 'https://lichess1.org/assets/css/bits.practice.index.f32d589a.css';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('absoluteIconUrl', () => {
  it('resolves the icon against the stylesheet that names it', () => {
    expect(absoluteIconUrl(' url(../hashed/stone-pile.2045b925.svg)', SHEET)).toBe(
      'url("https://lichess1.org/assets/hashed/stone-pile.2045b925.svg")',
    );
    expect(absoluteIconUrl('url("../hashed/divert.svg")', SHEET)).toBe(
      'url("https://lichess1.org/assets/hashed/divert.svg")',
    );
  });

  it('gives null for anything but a URL', () => {
    expect(absoluteIconUrl('', SHEET)).toBeNull();
    expect(absoluteIconUrl('none', SHEET)).toBeNull();
  });
});

describe('syncPracticeIcons', () => {
  it('copies each study icon, made absolute, onto the icon', () => {
    // Lichess's stylesheet link: as `stylesheet`, happy-dom would fetch it.
    document.head.innerHTML = `<link rel="alternate" href="${SHEET}">`;
    // As Lichess's `[class=…]` rules set it, here inline.
    document.body.innerHTML =
      '<main class="page-menu"><div class="practice-app"><a class="study">' +
      '<icon class="BJy6fEDf" style="---icon-bg-image: url(../hashed/stone-pile.svg)"></icon>' +
      '</a></div></main>' +
      '<div class="practice__side__title"><icon style="---icon-bg-image: url(../hashed/divert.svg)"></icon></div>';
    syncPracticeIcons();
    expect(
      queryAll(document, 'icon', HTMLElement).map(icon =>
        icon.style.getPropertyValue('--cdc-practice-icon'),
      ),
    ).toEqual([
      'url("https://lichess1.org/assets/hashed/stone-pile.svg")',
      'url("https://lichess1.org/assets/hashed/divert.svg")',
    ]);
  });
});
