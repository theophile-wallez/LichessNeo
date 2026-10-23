import { closestTo, createElement } from '#shared/dom.ts';
import type { PartKind } from '#shared/packs/pack.ts';
import { message } from '#content/platform/runtime.ts';
import { importSection } from '#content/packs/import-section.ts';
import type { Library } from '#content/packs/library.ts';
import { PACKS_HASH } from './address.ts';
import { buildLooksCard } from './looks-card.ts';
import { buildLooksPreview } from './looks-preview.ts';
import { readLichessLooks } from './lichess-looks.ts';
import { buildSwitchList } from './switch-list.ts';

// The settings' Board & sounds page: a card for the sounds, the board and the
// pieces (looks-card.ts), beside a board that shows them (looks-preview.ts),
// then the interface's own sounds and the packs these cards offer.
// Lichess's lists are read the first time it shows.

const KINDS: readonly PartKind[] = ['sound', 'board', 'piece'];

export interface LooksPage {
  readonly elements: readonly HTMLElement[];
  readonly show: (visible: boolean) => void;
}

export function buildLooksPage(library: Library): LooksPage {
  const cards = KINDS.map(kind => buildLooksCard(kind, library));
  const preview = buildLooksPreview();
  // A pick in the user menu, or packs read at last, move the rings here too.
  library.onChange(() => {
    for (const card of cards) card.mark();
  });
  // After the card's own listener: the set is picked when the move sounds.
  const sounds = cards[KINDS.indexOf('sound')]?.element;
  sounds?.addEventListener('click', event => {
    if (closestTo(event.target, '.ln-ext-src-item', HTMLElement)) preview.step();
  });
  const layout = createElement('div', { className: 'ln-ext-looks-page' });
  const column = createElement('div', { className: 'ln-ext-looks-page__cards' });
  const uiSounds = buildSwitchList([
    { key: 'uiSounds', title: message('settingUiSounds'), body: message('settingUiSoundsBody') },
  ]);
  const packs = importSection(library);
  column.append(...cards.map(card => card.element), uiSounds, packs);
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
        for (const [i, kind] of KINDS.entries()) cards[i]?.showLichess(looks?.[kind] ?? null);
        // Lichess's lists push the packs down: their link, which led there, still does.
        if (location.hash === PACKS_HASH) packs.scrollIntoView();
        return looks;
      });
    },
  };
}
