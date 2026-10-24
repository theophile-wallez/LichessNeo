import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { foldButtonMarkup, foldingCardMarkup, foldOnClick } from './card-fold.ts';
import { gameOverTexts } from './texts.ts';

const KEY = 'ln-ext-end-card-folded';
const texts = gameOverTexts();

function gamePage(): HTMLElement {
  setHtml(
    document.body,
    html`<main class="round"><div class="rcontrols"><div class="follow-up">${foldingCardMarkup(html`<section class="ln-ext-end__card"></section>`, texts)}${foldButtonMarkup(texts, 'unfold')}<a class="fbt" href="/abcd1234">Analysis board</a></div></div></main>`,
  );
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main) throw new Error('no game page');
  return main;
}

const chevron = (action: string): HTMLElement | null =>
  queryOne(document, `.ln-ext-end__fold--${action}`, HTMLElement);

beforeEach(() => {
  document.documentElement.lang = 'en';
});

afterEach(() => {
  localStorage.clear();
});

describe('the game page’s card fold', () => {
  it('opens folded when it was left so', () => {
    localStorage.setItem(KEY, '1');
    const main = gamePage();
    foldOnClick(main);
    expect(main.dataset.lnExtCardFolded).toBe('');
  });

  it('folds and unfolds on its chevrons, and keeps it for the next game', () => {
    const main = gamePage();
    foldOnClick(main);
    expect(main.dataset.lnExtCardFolded).toBeUndefined();
    chevron('fold')?.click();
    expect(main.dataset.lnExtCardFolded).toBe('');
    expect(localStorage.getItem(KEY)).toBe('1');
    chevron('unfold')?.click();
    expect(main.dataset.lnExtCardFolded).toBeUndefined();
    expect(localStorage.getItem(KEY)).toBe('0');
  });

  it('moves the focus to the chevron that shows next', () => {
    const main = gamePage();
    foldOnClick(main);
    chevron('fold')?.focus();
    chevron('fold')?.click();
    expect(document.activeElement).toBe(chevron('unfold'));
  });

  it('names each chevron by what it does', () => {
    gamePage();
    expect(chevron('fold')?.getAttribute('aria-label')).toBe('Hide the coach');
    expect(chevron('unfold')?.getAttribute('aria-label')).toBe('Show the coach');
  });
});
