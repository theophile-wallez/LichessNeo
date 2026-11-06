import FileZipIcon from '@hugeicons/core-free-icons/FileZipIcon';
import GithubIcon from '@hugeicons/core-free-icons/GithubIcon';
import { createElement } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { bySource, isFileItem, newestFirst } from '#shared/packs/items.ts';
import { hasPart, packTitle, type Pack, type PartKind } from '#shared/packs/pack.ts';
import { parsePackLink, sourceLabel } from '#shared/packs/source.ts';
import { message } from '#content/platform/runtime.ts';

// The looks card's packs (looks-card.ts), each where it came from apart:
// the items made from the user's files first, then each pack imported, under
// its name and its origin (a GitHub repository or a zip), the newest first.

/** A tile for one pack of the part. */
export type PackTile = (pack: Pack) => HTMLElement;

function origin(pack: Pack): HTMLElement {
  const source = parsePackLink(pack.link);
  const tag = createElement('span', {
    className: 'ln-ext-looks__origin',
    text: source ? sourceLabel(source) : message('packsFromZip'),
  });
  const icon = createElement('span', { className: 'ln-ext-looks__origin-icon' });
  setHtml(icon, hugeicon(source ? GithubIcon : FileZipIcon));
  tag.prepend(icon);
  return tag;
}

function section(title: HTMLElement, packs: readonly Pack[], tile: PackTile): HTMLElement[] {
  const grid = createElement('div', { className: 'ln-ext-looks__grid' });
  grid.append(...packs.map(tile));
  return [title, grid];
}

/** The part's packs in a section per origin, or nothing while it has none. */
export function packSections(
  kind: PartKind,
  packs: readonly Pack[],
  tile: PackTile,
): HTMLElement[] {
  const listed = newestFirst(packs.filter(pack => hasPart(pack, kind)));
  const own = listed.filter(isFileItem);
  const imported = listed.filter(pack => !isFileItem(pack));
  const mine =
    own.length === 0
      ? []
      : section(
          createElement('h4', { className: 'ln-ext-looks__sub', text: message('looksPacksMine') }),
          own,
          tile,
        );
  return [
    ...mine,
    ...bySource(imported).flatMap(group => {
      const title = createElement('h4', { className: 'ln-ext-looks__sub' });
      title.append(
        createElement('span', { className: 'ln-ext-looks__sub-name', text: packTitle(group[0]) }),
        origin(group[0]),
      );
      return section(title, group, tile);
    }),
  ];
}
