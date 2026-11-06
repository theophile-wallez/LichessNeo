import GithubIcon from '@hugeicons/core-free-icons/GithubIcon';
import { createElement } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { setHtml } from '#shared/html.ts';
import { exportFiles } from '#shared/packs/export.ts';
import { onlyPart } from '#shared/packs/items.ts';
import { hasPart, PART_KINDS, type Pack, type PartKind } from '#shared/packs/pack.ts';
import { PACK_TOPIC, packRepoName } from '#shared/packs/sharing.ts';
import { createZip } from '#shared/packs/zip.ts';
import { repositoryPage } from '#shared/repository.ts';
import { saveFile } from '#shared/save-file.ts';
import { message } from '#content/platform/runtime.ts';
import type { Library } from './library.ts';
import { packThumb } from './pack-thumb.ts';

// The Packs card's composer: a pack to share, put together from any of the
// boards, piece sets and sound sets imported, under a name, and saved as a
// zip (shared/packs/export.ts) that anyone can drop on their own card, named
// as the GitHub repository it would be shared from (shared/packs/sharing.ts).

const GROUPS: Readonly<Record<PartKind, string>> = {
  board: 'packsComposeBoards',
  piece: 'packsComposePieces',
  sound: 'packsComposeSounds',
};

const MAX_NAME = 40;
const SHARE_URL = repositoryPage('docs/packs.md#sharing-a-pack');
const ON = 'ln-ext-compose__chip--on';

/** What's chosen, kept while the card is drawn again. */
interface Composition {
  name: string | null;
  chosen: ReadonlySet<string> | null;
}

const composition: Composition = { name: null, chosen: null };

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

function chosenParts(library: Library): Pack[] {
  const chosen = chosenKeys(library);
  return PART_KINDS.flatMap(kind =>
    library
      .packs()
      .filter(pack => hasPart(pack, kind) && chosen.has(keyOf(kind, pack.id)))
      .map(pack => onlyPart(pack, kind)),
  );
}

const packName = (): string => (composition.name ?? message('packsComposeDefault')).trim();

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

function group(kind: PartKind, drawn: Drawn): HTMLElement[] {
  const packs = drawn.library.packs().filter(pack => hasPart(pack, kind));
  if (packs.length === 0) return [];
  const box = createElement('div', { className: 'ln-ext-compose__group' });
  const chips = createElement('div', { className: 'ln-ext-compose__chips' });
  chips.append(...packs.map(pack => chip(pack, kind, drawn)));
  box.append(
    createElement('span', { className: 'ln-ext-compose__label', text: message(GROUPS[kind]) }),
    chips,
  );
  return [box];
}

function nameField(refresh: () => void): HTMLInputElement {
  const field = createElement('input', {
    className: 'ln-ext-compose__name',
    attrs: {
      type: 'text',
      value: composition.name ?? message('packsComposeDefault'),
      maxlength: String(MAX_NAME),
      spellcheck: 'false',
      'aria-label': message('packsComposeName'),
      placeholder: message('packsComposeName'),
    },
  });
  field.addEventListener('input', () => {
    composition.name = field.value;
    refresh();
  });
  return field;
}

function exportButton(library: Library): HTMLButtonElement {
  const button = createElement('button', {
    className: 'ln-ext-compose__export',
    text: message('packsComposeExport'),
    attrs: { type: 'button' },
  });
  button.addEventListener('click', () => {
    const parts = chosenParts(library);
    const name = packName();
    if (name === '' || parts.length === 0) return;
    saveFile(createZip(exportFiles({ name, parts })), `${packRepoName(name)}.zip`);
  });
  return button;
}

function shareRow(label: string, value: HTMLElement): HTMLElement {
  const row = createElement('div', { className: 'ln-ext-compose__share-row' });
  row.append(
    createElement('span', { className: 'ln-ext-compose__share-label', text: label }),
    value,
  );
  return row;
}

// How to share the pack so others find it, with the repository's name it takes.
function shareBox(repo: HTMLElement): HTMLElement {
  const box = createElement('div', { className: 'ln-ext-compose__share' });
  const title = createElement('span', { className: 'ln-ext-compose__share-title' });
  setHtml(title, hugeicon(GithubIcon));
  title.append(message('packsShareTitle'));
  box.append(
    title,
    createElement('p', { className: 'ln-ext-compose__hint', text: message('packsShareHint') }),
    shareRow(message('packsShareRepo'), repo),
    shareRow(
      message('packsShareTopic'),
      createElement('code', { className: 'ln-ext-compose__code', text: PACK_TOPIC }),
    ),
    createElement('a', {
      className: 'ln-ext-compose__share-help',
      text: message('packsShareHelp'),
      attrs: { href: SHARE_URL, target: '_blank', rel: 'noopener' },
    }),
  );
  return box;
}

/** The composer, or an empty box while there's nothing to put in a pack. */
export function composer(library: Library): HTMLElement {
  const box = createElement('div', { className: 'ln-ext-compose' });
  if (library.packs().length === 0) return box;
  const button = exportButton(library);
  const repo = createElement('code', { className: 'ln-ext-compose__code' });
  const refresh = (): void => {
    button.disabled = packName() === '' || chosenParts(library).length === 0;
    repo.textContent = packRepoName(packName());
  };
  const drawn: Drawn = { library, refresh };
  box.append(
    createElement('h3', { className: 'ln-ext-compose__title', text: message('packsCompose') }),
    createElement('p', { className: 'ln-ext-compose__hint', text: message('packsComposeHint') }),
    nameField(refresh),
    ...PART_KINDS.flatMap(kind => group(kind, drawn)),
    button,
    shareBox(repo),
  );
  refresh();
  return box;
}
