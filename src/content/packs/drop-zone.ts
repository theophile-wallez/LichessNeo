import { createElement } from '#shared/dom.ts';
import type { LocalFile } from '#shared/packs/local.ts';
import type { PartKind } from '#shared/packs/pack.ts';
import { repositoryPage } from '#shared/repository.ts';
import { message } from '#content/platform/runtime.ts';
import { droppedFiles, pickedFiles } from './local-files.ts';

// The Packs card's zones for the user's own files, one for each kind, the
// last tile of its row, and a line for an exported pack's zip, each taking
// the files dropped on it.

export type DropKind = PartKind | 'pack';

interface ZoneText {
  readonly title: string;
  readonly hint?: string;
  /** The example pack's files of the zone's kind (packs/example). */
  readonly example: string;
}

const ZONES: Readonly<Record<DropKind, ZoneText>> = {
  piece: {
    title: 'packsAddPieces',
    hint: 'packsDropPiecesHint',
    example: 'packs/samples/README.md#pieces',
  },
  board: {
    title: 'packsAddBoard',
    hint: 'packsDropBoardHint',
    example: 'packs/samples/README.md#boards',
  },
  sound: {
    title: 'packsAddSounds',
    hint: 'packsDropSoundsHint',
    example: 'packs/samples/README.md#sounds',
  },
  pack: { title: 'packsDropPack', example: 'packs/warm-wood.zip' },
};

const OVER = 'ln-ext-packs__drop--over';

/** Reads the files given, once they're all in. */
export type Gather = () => Promise<readonly LocalFile[]>;

// A link in a label opens itself, and leaves the file field closed.
const exampleLink = (path: string): HTMLElement =>
  createElement('a', {
    className: 'ln-ext-packs__example',
    text: message('packsExample'),
    attrs: { href: repositoryPage(path), target: '_blank', rel: 'noopener' },
  });

function zoneText(zone: HTMLElement, { title, hint, example }: ZoneText): void {
  zone.append(
    createElement('span', {
      className: 'ln-ext-packs__drop-icon',
      attrs: { 'aria-hidden': 'true' },
    }),
    createElement('span', { className: 'ln-ext-packs__drop-title', text: message(title) }),
  );
  if (hint !== undefined)
    zone.append(
      createElement('span', { className: 'ln-ext-packs__drop-hint', text: message(hint) }),
    );
  zone.append(exampleLink(example));
}

// The pack's zip is picked in the browser's file field, the zone its label;
// the other zones open the import dialog, where files are picked one by one.
function clicked(zone: HTMLElement, kind: DropKind, onFiles: (gather: Gather) => void): void {
  if (kind !== 'pack') {
    zone.setAttribute('role', 'button');
    zone.tabIndex = 0;
    const open = (event: Event): void => {
      // The example's link opens itself.
      if (event.target instanceof Element && event.target.closest('a')) return;
      onFiles(() => Promise.resolve([]));
    };
    zone.addEventListener('click', open);
    zone.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open(event);
      }
    });
    return;
  }
  const input = createElement('input', {
    className: 'ln-ext-packs__file',
    attrs: { type: 'file', multiple: '', accept: '.zip' },
  });
  zone.append(input);
  input.addEventListener('change', () => {
    // Copied first: emptying the field empties its list.
    const files = [...(input.files ?? [])];
    input.value = '';
    if (files.length > 0) onFiles(() => pickedFiles(files));
  });
}

export function dropZone(kind: DropKind, onFiles: (gather: Gather) => void): HTMLElement {
  const zone: HTMLElement = createElement(kind === 'pack' ? 'label' : 'div', {
    className: `ln-ext-packs__drop ln-ext-packs__drop--${kind}`,
  });
  zoneText(zone, ZONES[kind]);
  clicked(zone, kind, onFiles);
  zone.addEventListener('dragover', event => {
    event.preventDefault();
    zone.classList.toggle(OVER, true);
  });
  zone.addEventListener('dragleave', event => {
    // Fired too on going over one of its children.
    const inside = event.relatedTarget instanceof Node && zone.contains(event.relatedTarget);
    if (!inside) zone.classList.toggle(OVER, false);
  });
  zone.addEventListener('drop', event => {
    event.preventDefault();
    zone.classList.toggle(OVER, false);
    const transfer = event.dataTransfer;
    if (!transfer) return;
    const files = droppedFiles(transfer);
    onFiles(() => files);
  });
  return zone;
}
