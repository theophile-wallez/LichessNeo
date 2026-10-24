import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const STYLES = join(import.meta.dirname, '..');
const SHEETS = ['analysis/export.css', 'review/sheet.css'];
// Lichess's own rule (ui/analyse/css/_underboard.scss): one panel at a time, the tab's.
const LICHESS_RULE =
  '.analyse__underboard__panels > div { display: none; }' +
  '.analyse__underboard__panels > div.active { display: block; }';

const PANELS =
  '<main class="analyse"><div class="analyse__underboard__panels">' +
  '<div class="ctable"></div><div class="fen-pgn"></div>' +
  '</div></main>';

function styled(selector: string): CSSStyleDeclaration {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
}

function load(): void {
  const style = document.createElement('style');
  style.textContent =
    LICHESS_RULE + SHEETS.map(sheet => readFileSync(join(STYLES, sheet), 'utf8')).join('\n');
  document.head.append(style);
  document.body.innerHTML = PANELS;
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.documentElement.className = '';
});

describe('the share and export panel', () => {
  it('lays its sections out as a column once its tab is picked', () => {
    load();
    expect(styled('.fen-pgn').display).toBe('none');
    document.querySelector('.fen-pgn')?.classList.add('active');
    expect(styled('.fen-pgn').display).toBe('flex');
    expect(styled('.fen-pgn').flexDirection).toBe('column');
  });

  it('lays them out as a column in the review’s sheet, which shows it always', () => {
    document.documentElement.className = 'ln-ext-review-sheet';
    load();
    expect(styled('.fen-pgn').display).toBe('flex');
  });
});
