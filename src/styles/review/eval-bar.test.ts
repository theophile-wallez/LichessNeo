import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const STYLES = join(import.meta.dirname, '..');
const SHEETS = ['analysis/layout.css', 'board/coordinates.css', 'review/eval-bar.css'];

const BOARD =
  '<main class="analyse"><div class="eval-gauge"></div>' +
  '<div id="ln-ext-evalbar"><div class="ln-ext-evalbar__fill"></div></div></main>';

function styled(selector: string): CSSStyleDeclaration {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the eval bar', () => {
  it('is as wide as the gauge column, as Lichess’s bar is', () => {
    const style = document.createElement('style');
    style.textContent = SHEETS.map(sheet => readFileSync(join(STYLES, sheet), 'utf8')).join('\n');
    document.head.append(style);
    document.body.innerHTML = BOARD;
    expect(styled('#ln-ext-evalbar').width).toBe('22px');
    expect(styled('.eval-gauge').width).toBe('22px');
  });

  it('rounds White’s share at the frontier too', () => {
    const style = document.createElement('style');
    style.textContent = readFileSync(join(STYLES, 'review/eval-bar.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML = BOARD;
    expect(styled('.ln-ext-evalbar__fill').borderRadius).toBe(
      styled('#ln-ext-evalbar').borderRadius,
    );
  });
});
