import { closestTo, createElement } from '#shared/dom.ts';
import { PART_KINDS } from '#shared/packs/pack.ts';
import type { Library } from '#content/packs/library.ts';
import { buildLooksCard } from './looks-card.ts';
import { buildLooksPreview } from './looks-preview.ts';
import { readLichessLooks } from './lichess-looks.ts';

// The settings' Board & sounds page: a card for the board, the pieces and the
// sounds (looks-card.ts), beside a board that shows them (looks-preview.ts).
// Lichess's lists are read the first time it shows.

export interface LooksPage {
  readonly elements: readonly HTMLElement[];
  readonly show: (visible: boolean) => void;
}

export function buildLooksPage(library: Library): LooksPage {
  const cards = PART_KINDS.map(kind => buildLooksCard(kind, library));
  const preview = buildLooksPreview();
  // A pick in the user menu, or packs read at last, move the rings here too.
  library.onChange(() => {
    for (const card of cards) card.mark();
  });
  // After the card's own listener: the set is picked when the move sounds.
  const sounds = cards[PART_KINDS.indexOf('sound')]?.element;
  sounds?.addEventListener('click', event => {
    if (closestTo(event.target, '.lr-ext-src-item', HTMLElement)) preview.step();
  });
  const layout = createElement('div', { className: 'lr-ext-looks-page' });
  const column = createElement('div', { className: 'lr-ext-looks-page__cards' });
  column.append(...cards.map(card => card.element));
  layout.append(preview.element, column);
  let shown = false;
  let read = false;
  return {
    elements: [layout],
    show: visible => {
      const opening = visible && !shown;
      shown = visible;
      if (opening) preview.show();
      if (!opening || read) return;
      read = true;
      void readLichessLooks().then(looks => {
        // Unread, they're tried again the next time the page opens.
        read = looks !== null;
        for (const [i, kind] of PART_KINDS.entries()) cards[i]?.showLichess(looks?.[kind] ?? null);
        return looks;
      });
    },
  };
}
