import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rules (ui/puzzle/css/_tools.scss): hidden until the puzzle's first seconds pass.
const LICHESS_RULES =
  '.puzzle__feedback .view_solution { visibility: hidden; opacity: 0; }' +
  '.puzzle__feedback .view_solution.show { visibility: visible; opacity: 0.8; }';

function viewSolution(classes: string): HTMLElement {
  const style = document.createElement('style');
  style.textContent =
    LICHESS_RULES + readFileSync(join(import.meta.dirname, 'status-banner.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML =
    '<main class="puzzle"><div class="puzzle__feedback play">' +
    `<div class="${classes}"><button class="button button-empty"></button></div>` +
    '</div></main>';
  const element = queryOne(document, '.view_solution', HTMLElement);
  if (!element) throw new Error('no view_solution');
  return element;
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the hint and solution buttons', () => {
  it('show from the puzzle start, before Lichess allows them', () => {
    const style = getComputedStyle(viewSolution('view_solution'));
    expect(style.visibility).toBe('visible');
    expect(style.opacity).toBe('1');
  });

  it("keep the streak's skip hidden once it's used", () => {
    expect(getComputedStyle(viewSolution('view_solution skip')).visibility).toBe('hidden');
  });

  it("show the streak's skip while one is left", () => {
    expect(getComputedStyle(viewSolution('view_solution skip show')).visibility).toBe('visible');
  });
});

// The palette's roles the end card's colors name (theme/palette.css), as plain values.
const PALETTE =
  ':root { --ln-ext-good: #3cb371; --ln-ext-good-hover: #7fe0a8; --ln-ext-red: #ff6b6b;' +
  ' --ln-ext-red-dark: #c0392b; }';
// Lichess's own: its row of votes hidden on phones.
const LICHESS_MORE = '.puzzle__feedback .puzzle__more { display: none; }';

function endCard(html: string): void {
  const style = document.createElement('style');
  style.textContent =
    PALETTE + LICHESS_MORE + readFileSync(join(import.meta.dirname, 'status-banner.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML = `<main class="puzzle"><div class="puzzle__feedback after">${html}</div></main>`;
}

const display = (selector: string): string => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element).display;
};

const partColor = (part: string): string => {
  const element = queryOne(document, `.ln-ext-puzzle-result__${part}`, HTMLElement);
  return element ? getComputedStyle(element).color : '';
};

describe('the end card', () => {
  it('keeps the row of the computer and the votes on phones, but an empty one', () => {
    endCard('<div class="puzzle__more"><a class="practice button"></a></div>');
    expect(display('.puzzle__more')).toBe('flex');
    endCard('<div class="puzzle__more"></div>');
    expect(display('.puzzle__more')).toBe('none');
  });

  const RESULT =
    '<span class="ln-ext-puzzle-result__verdict">Missed</span>' +
    '<span class="ln-ext-puzzle-result__change"><span class="ln-ext-puzzle-result__diff">−8</span>' +
    '<span class="ln-ext-puzzle-result__rating">1,503</span></span>';

  it('shows only the parts of the result it has', () => {
    endCard(`<div class="ln-ext-puzzle-result" data-ln-ext-verdict="failed">${RESULT}</div>`);
    expect(display('.ln-ext-puzzle-result__verdict')).not.toBe('none');
    expect(display('.ln-ext-puzzle-result__change')).toBe('none');
    endCard(`<div class="ln-ext-puzzle-result" data-ln-ext-sign="down">${RESULT}</div>`);
    expect(display('.ln-ext-puzzle-result__verdict')).toBe('none');
    expect(display('.ln-ext-puzzle-result__change')).toBe('flex');
  });

  it('writes the verdict and the change in their hue, on a tint of it', () => {
    endCard(
      `<div class="ln-ext-puzzle-result" data-ln-ext-verdict="solved" data-ln-ext-sign="down">${RESULT}</div>`,
    );
    expect(partColor('verdict')).toBe('#7fe0a8');
    expect(partColor('diff')).toBe('#ff6b6b');
  });
});
