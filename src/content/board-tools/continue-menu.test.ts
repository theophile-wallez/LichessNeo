import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { listenToContinueMenu } from './continue-menu.ts';

// The analysis menu as Lichess draws it: "Continue from here" (its swords) opens
// a dialog of the hidden links at the menu's end, on a click.
const MENU =
  '<main class="analyse"><div class="analyse__tools"><div class="action-menu sub-box">' +
  '<div class="title">Analysis board</div><div class="inner"><div class="action-menu__tools">' +
  '<button data-icon="\ue020">Flip board</button><button data-icon="\ue033">Continue from here</button>' +
  '</div><div class="continue-with none"><a class="button" href="/#ai">Play against computer</a></div>' +
  '</div></div></div></main>';

const menu = (): HTMLElement | null => queryOne(document, '.action-menu', HTMLElement);
const back = (): HTMLButtonElement | null =>
  queryOne(document, '.action-menu > .ln-ext-menu-back', HTMLButtonElement);
const rowOf = (words: string): HTMLButtonElement | undefined =>
  [...document.querySelectorAll('.action-menu__tools > button')].find(
    (row): row is HTMLButtonElement =>
      row instanceof HTMLButtonElement && row.textContent === words,
  );

let dialogs = 0;

beforeAll(() => listenToContinueMenu());

afterEach(() => {
  document.body.innerHTML = '';
  dialogs = 0;
});

function serve(): void {
  document.body.innerHTML = MENU;
  for (const row of document.querySelectorAll('.action-menu__tools > button'))
    row.addEventListener('click', () => (dialogs += 1));
}

describe('"Continue from here"', () => {
  it('opens its links as a sub-menu under a back row, not Lichess’s dialog', () => {
    serve();
    rowOf('Continue from here')?.click();
    expect(dialogs).toBe(0);
    expect(menu()?.dataset.lnExtSub).toBe('continue');
    expect(back()?.textContent).toBe('Continue from here');
  });

  it('goes back to the menu from the back row', () => {
    serve();
    rowOf('Continue from here')?.click();
    back()?.click();
    expect(menu()?.dataset.lnExtSub).toBeUndefined();
  });

  it('leaves the menu’s other rows to Lichess', () => {
    serve();
    rowOf('Flip board')?.click();
    expect(dialogs).toBe(1);
    expect(menu()?.dataset.lnExtSub).toBeUndefined();
  });

  it('leaves Lichess its dialog where the menu has no links to show', () => {
    serve();
    document.querySelector('.continue-with')?.remove();
    rowOf('Continue from here')?.click();
    expect(dialogs).toBe(1);
    expect(back()).toBeNull();
  });
});
