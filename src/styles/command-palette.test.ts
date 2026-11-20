import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

// Lichess's dialog sheet (ui/lib/css/component/_dialog.scss), which the home page loads
// from the start: it centers every dialog by a translate, as a flex column, open or not.
const LICHESS_RULE =
  'dialog { display: flex; flex-direction: column; position: fixed; top: 50%;' +
  ' transform: translate(-50%, -50%); } html:not([dir="rtl"]) dialog { left: 50%; }';

function paletteUnder(open: boolean): CSSStyleDeclaration {
  const style = document.createElement('style');
  style.textContent =
    LICHESS_RULE + readFileSync(join(import.meta.dirname, 'command-palette.css'), 'utf8');
  document.head.append(style);
  const dialog = document.createElement('dialog');
  dialog.id = 'ln-ext-palette';
  dialog.open = open;
  document.body.append(dialog);
  return getComputedStyle(dialog);
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the command palette under Lichess’s dialog sheet', () => {
  it('stays where it covers the window, its box centered in a row', () => {
    const palette = paletteUnder(true);
    expect(palette.transform).toBe('none');
    expect(palette.display).toBe('flex');
    expect(palette.flexDirection).toBe('row');
  });

  it('stays out of sight once closed', () => {
    expect(paletteUnder(false).display).toBe('none');
  });
});
