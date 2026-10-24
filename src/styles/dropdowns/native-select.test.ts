import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's form3 rule (bits.auth and every form page), which makes a select a block.
const LICHESS_RULE = '.form-control { display: block; width: 100%; height: calc(2.7em + 2px); }';

/** The display of the select in `markup`, Lichess's rule and this sheet applied. */
function selectDisplay(markup: string): string {
  const style = document.createElement('style');
  style.textContent =
    LICHESS_RULE + readFileSync(join(import.meta.dirname, 'native-select.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML = markup;
  const select = queryOne(document, 'select', HTMLSelectElement);
  if (!select) throw new Error('no select');
  return getComputedStyle(select).display;
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('a form’s select', () => {
  // A block puts the chevron on a line of its own, under the value.
  it('lays its value and chevron out in a row', () => {
    expect(selectDisplay('<select class="form-control"><option>20</option></select>')).toBe('flex');
  });

  it('stays a list box when it shows several rows', () => {
    expect(
      selectDisplay('<select class="form-control" multiple><option>20</option></select>'),
    ).toBe('block');
  });
});
