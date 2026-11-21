import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { queryAll } from '#shared/dom.ts';

// Lichess's follow-up buttons in the order it serves them (ui/round/src/view/button.ts):
// Rematch, then "New opponent", then the analysis link, always last.
const FOLLOW_UP =
  '<main class="round"><div class="rcontrols"><div class="follow-up">' +
  '<button class="fbt rematch white">Rematch</button>' +
  '<a class="fbt new-opponent" href="/?hook_like=abcdefgh">New opponent</a>' +
  '<a class="fbt" href="/abcdefgh">Analysis board</a>' +
  '</div></div></main>';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

/** The buttons' texts in the order the row lays them out. */
function laidOut(): string[] {
  const buttons = queryAll(document, '.follow-up > .fbt', HTMLElement);
  return buttons
    .map((button, index) => ({ button, index, order: Number(getComputedStyle(button).order) }))
    .toSorted((first, second) => first.order - second.order || first.index - second.index)
    .map(({ button }) => button.textContent);
}

it('lines up the new game, Rematch, then Game Review', () => {
  const style = document.createElement('style');
  style.textContent = readFileSync(join(import.meta.dirname, 'game-over.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML = FOLLOW_UP;
  expect(laidOut()).toEqual(['New opponent', 'Rematch', 'Analysis board']);
});

const minWidths = (): string[] =>
  queryAll(document, '.follow-up > .fbt', HTMLElement).map(
    button => getComputedStyle(button).minWidth,
  );

it('keeps each label’s longest word in its button, a waiting Rematch aside', () => {
  const style = document.createElement('style');
  style.textContent = ['game-over.css', 'rematch.css']
    .map(sheet => readFileSync(join(import.meta.dirname, sheet), 'utf8'))
    .join('\n');
  document.head.append(style);
  document.body.innerHTML = FOLLOW_UP;
  expect(minWidths()).toEqual(['min-content', 'min-content', 'min-content']);
  // Its word goes when it doesn't fit (rematch.css): the row's share is all it takes.
  document.querySelector('.rematch')?.classList.add('me');
  expect(minWidths()).toEqual(['0', 'min-content', 'min-content']);
});
