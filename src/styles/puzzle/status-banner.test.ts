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
