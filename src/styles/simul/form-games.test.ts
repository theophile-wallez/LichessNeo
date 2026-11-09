import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Our rule that glues a button to the input before it (pages/tabs-tables-forms.css).
const GLUE_RULE = "input:not([type='hidden']) + .button { border-radius: 0 6px 6px 0 !important; }";

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the simul form’s board editor button', () => {
  it('keeps its four corners, though it follows the position’s field', () => {
    const style = document.createElement('style');
    style.textContent =
      GLUE_RULE + readFileSync(join(import.meta.dirname, 'form-games.css'), 'utf8');
    document.head.append(style);
    // content/simul-form puts the button right after Lichess's field.
    document.body.innerHTML =
      '<main class="simul-form"><input id="form3-position" class="form-control">' +
      '<a class="ln-ext-simul-form__editor button button-empty" href="/editor">Board editor</a></main>';
    const button = queryOne(document, '.ln-ext-simul-form__editor', HTMLElement);
    if (!button) throw new Error('no button');
    expect(getComputedStyle(button).borderRadius).toBe('8px');
  });
});
