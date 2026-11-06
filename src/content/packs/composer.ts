import { createElement } from '#shared/dom.ts';
import { bySource, isFileItem, newestFirst, onlyPart } from '#shared/packs/items.ts';
import { hasPart, PART_KINDS, packTitle, type Pack, type PartKind } from '#shared/packs/pack.ts';
import { message } from '#content/platform/runtime.ts';
import type { Library } from './library.ts';
import { packThumb } from './pack-thumb.ts';

// What the composer (compose-dialog.ts) puts in a pack: for each kind, the
// user's own items first, set apart, then each imported pack's parts, folded
// under its name unless one of them is in; the newest first.

const GROUPS: Readonly<Record<PartKind, string>> = {
  board: 'packsComposeBoards',
  piece: 'packsComposePieces',
  sound: 'packsComposeSounds',
};

const ON = 'ln-ext-compose__chip--on';

/** What's chosen, kept while the dialog is closed and opened again. */
interface Composition {
  name: string | null;
  chosen: ReadonlySet<string> | null;
}

export const composition: Composition = { name: null, chosen: null };

const keyOf = (kind: PartKind, id: string): string => `${kind} ${id}`;

// What's shown is chosen until the user picks: then their picks are kept.
function chosenKeys(library: Library): ReadonlySet<string> {
  return composition.chosen ?? new Set(PART_KINDS.map(kind => keyOf(kind, library.current(kind))));
}

function choose(library: Library, key: string, chosen: boolean): void {
  const keys = new Set(chosenKeys(library));
  if (chosen) keys.add(key);
  else keys.delete(key);
  composition.chosen = keys;
}

export function chosenParts(library: Library): Pack[] {
  const chosen = chosenKeys(library);
  return PART_KINDS.flatMap(kind =>
    library
      .packs()
      .filter(pack => hasPart(pack, kind) && chosen.has(keyOf(kind, pack.id)))
      .map(pack => onlyPart(pack, kind)),
  );
}

export const packName = (): string => (composition.name ?? message('packsComposeDefault')).trim();

interface Drawn {
  readonly library: Library;
  /** Enables the export once there's a name and a part to export. */
  readonly refresh: () => void;
}

function chip(pack: Pack, kind: PartKind, { library, refresh }: Drawn): HTMLElement {
  const label = createElement('label', { className: 'ln-ext-compose__chip' });
  const key = keyOf(kind, pack.id);
  const box = createElement('input', { attrs: { type: 'checkbox' } });
  box.checked = chosenKeys(library).has(key);
  label.classList.toggle(ON, box.checked);
  box.addEventListener('change', () => {
    choose(library, key, box.checked);
    label.classList.toggle(ON, box.checked);
    refresh();
  });
  label.append(
    box,
    packThumb([onlyPart(pack, kind)]),
    createElement('span', { className: 'ln-ext-compose__chip-name', text: pack.name }),
  );
  return label;
}

function chips(packs: readonly Pack[], kind: PartKind, drawn: Drawn): HTMLElement {
  const box = createElement('div', { className: 'ln-ext-compose__chips' });
  box.append(...packs.map(pack => chip(pack, kind, drawn)));
  return box;
}

/** The user's own items, in a box of their own, first. */
function ownItems(items: readonly Pack[], kind: PartKind, drawn: Drawn): HTMLElement[] {
  if (items.length === 0) return [];
  const box = createElement('div', { className: 'ln-ext-compose__mine' });
  box.append(
    createElement('span', { className: 'ln-ext-compose__mine-label', text: message('packsMine') }),
    chips(items, kind, drawn),
  );
  return [box];
}

/** An imported pack's parts of the kind, folded under its name until one is chosen. */
function source(packs: readonly [Pack, ...Pack[]], kind: PartKind, drawn: Drawn): HTMLElement {
  const fold = createElement('details', { className: 'ln-ext-compose__source' });
  const chosen = chosenKeys(drawn.library);
  fold.open = packs.some(pack => chosen.has(keyOf(kind, pack.id)));
  const summary = createElement('summary', { text: packTitle(packs[0]) });
  summary.append(
    createElement('span', { className: 'ln-ext-compose__count', text: String(packs.length) }),
  );
  fold.append(summary, chips(packs, kind, drawn));
  return fold;
}

function group(kind: PartKind, drawn: Drawn): HTMLElement[] {
  const packs = newestFirst(drawn.library.packs().filter(pack => hasPart(pack, kind)));
  if (packs.length === 0) return [];
  const box = createElement('div', {
    className: `ln-ext-compose__group ln-ext-compose__group--${kind}`,
  });
  box.append(
    createElement('span', { className: 'ln-ext-compose__label', text: message(GROUPS[kind]) }),
    ...ownItems(packs.filter(isFileItem), kind, drawn),
    ...bySource(packs.filter(pack => !isFileItem(pack))).map(parts => source(parts, kind, drawn)),
  );
  return [box];
}

/** The parts to choose from, a group for each kind the library has. */
export function composerGroups(library: Library, refresh: () => void): HTMLElement[] {
  const drawn: Drawn = { library, refresh };
  return PART_KINDS.flatMap(kind => group(kind, drawn));
}
