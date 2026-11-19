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

// Lichess's own rules (ui/lobby/css/_setup.scss): the title and the footer on bands of
// their own.
const SETUP_RULES =
  '.game-setup h2 { padding: 1.5rem 0; background: rgb(38, 36, 33); }' +
  '.game-setup .footer { padding: 1.5rem; background: rgb(38, 36, 33); }';

const SETUP =
  '<dialog open><div class="scrollable"><div class="game-setup"><h2>Play against computer</h2>' +
  '<div class="setup-content"></div><div class="footer"></div></div></div></dialog>';

describe('the game setup’s dialog', () => {
  it('sets its title and its footer on the dialog itself', () => {
    const style = document.createElement('style');
    style.textContent =
      SETUP_RULES +
      ['dialogs.css', 'setup-options.css']
        .map(file => readFileSync(join(import.meta.dirname, file), 'utf8'))
        .join('');
    document.head.append(style);
    document.body.innerHTML = SETUP;
    for (const selector of ['h2', '.footer']) {
      const part = queryOne(document, `.game-setup ${selector}`, HTMLElement);
      if (!part) throw new Error(`no ${selector}`);
      expect(getComputedStyle(part).backgroundColor).not.toBe('rgb(38, 36, 33)');
    }
    const title = queryOne(document, '.game-setup h2', HTMLElement);
    expect(title && getComputedStyle(title).paddingTop).toBe('0px');
  });
});
