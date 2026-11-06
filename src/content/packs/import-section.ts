import { createElement } from '#shared/dom.ts';
import { message } from '#content/platform/runtime.ts';
import { composeButton } from './compose-dialog.ts';
import { importForm } from './import-form.ts';
import { statusLine } from './import-status.ts';
import { itemRows } from './item-tiles.ts';
import type { Library } from './library.ts';
import { packListing } from './pack-rows.ts';

// The extension settings' Packs card (styles/pages/settings-packs.css): the
// user's own boards, piece sets and sound sets first, a row of tiles for
// each kind (item-tiles.ts), then the packs imported (pack-rows.ts) and the
// form that imports more; last, the button that opens the composer, to
// export a pack of them. They're picked in the user menu too.

function head(): HTMLElement {
  const box = createElement('div', { className: 'ln-ext-packs__head' });
  const heading = createElement('div', { className: 'ln-ext-packs__heading' });
  const title = createElement('h2', {
    className: 'ln-ext-setting__title',
    text: message('packsTitle'),
  });
  title.append(createElement('span', { className: 'ln-ext-beta', text: message('packsBeta') }));
  heading.append(
    title,
    createElement('p', { className: 'ln-ext-setting__body', text: message('packsBody') }),
  );
  box.append(
    createElement('span', { className: 'ln-ext-setting__icon', attrs: { 'aria-hidden': 'true' } }),
    heading,
  );
  return box;
}

/** The Packs card, kept in step with the library: it lists the packs once `loadAll` reads them. */
export function importSection(library: Library): HTMLElement {
  const section = createElement('section', { className: 'ln-ext-packs' });
  let items = itemRows(library);
  let listing = packListing(library);
  const imported = createElement('div', { className: 'ln-ext-packs__imported' });
  imported.append(
    createElement('h3', {
      className: 'ln-ext-packs__kind-title',
      text: message('packsImportedTitle'),
    }),
    listing,
    importForm(library, 'packs'),
  );
  section.append(head(), statusLine(), items, imported, composeButton(library));
  // A listener stays for good: a page draws the section once, again only if Lichess drops it.
  library.onChange(() => {
    const nextItems = itemRows(library);
    items.replaceWith(nextItems);
    items = nextItems;
    const next = packListing(library);
    listing.replaceWith(next);
    listing = next;
  });
  return section;
}
