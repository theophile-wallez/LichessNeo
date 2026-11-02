import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';

// Lichess's own rules (ui/analyse/css/study/_modal.scss): the actions faded and pulled up
// over the line below them.
const LICHESS_RULES =
  '.study-modal .destructive button { opacity: 0.8; }' +
  '.study-modal .form-actions-secondary { margin-bottom: -1rem; }';

// A chapter's edit form, as lila's chapterEditForm.ts draws it in its dialog.
const EDIT_FORM =
  '<dialog open><div class="scrollable"><div class="dialog-content chapter-edit study-modal">' +
  '<form class="form3"><div class="form-actions-secondary destructive">' +
  '<button type="button" class="button button-red button-empty">Clear annotations</button>' +
  '<button type="button" class="button button-red button-empty">Clear variations</button>' +
  '</div></form></div></div></dialog>';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('a study chapter’s dialog', () => {
  it('spaces its lesser actions apart, unfaded, over room before the line', () => {
    const style = document.createElement('style');
    style.textContent =
      LICHESS_RULES + readFileSync(join(import.meta.dirname, 'dialogs.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML = EDIT_FORM;
    const actions = queryOne(document, '.form-actions-secondary', HTMLElement);
    if (!actions) throw new Error('no actions');
    expect(getComputedStyle(actions).display).toBe('flex');
    expect(getComputedStyle(actions).gap).toBe('8px');
    expect(getComputedStyle(actions).marginBottom).toBe('0px');
    for (const button of queryAll(actions, '.button', HTMLElement))
      expect(getComputedStyle(button).opacity).toBe('1');
  });
});
