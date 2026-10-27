import { onHeadParsed, setData } from '#shared/dom.ts';
import { onStoredElsewhere, readStored, StorageKey, writeStored } from '#shared/storage.ts';
import { createSvgElement } from '#shared/svg.ts';
import { HexSchema } from './custom-board.ts';
import { type Swatch, swatchRow } from './swatch-row.ts';

// The black pieces' color, for sets whose black reads poorly on a dark board.
// An SVG filter maps each piece's black to the color picked and leaves its
// white as it is, so it works on any set, Lichess's or a pack's, flat or 3D:
// styles/board/pieces.css applies it while `data-ln-ext-black-pieces` is on <html>.

/** As the set draws them: no filter at all. */
export const AS_DRAWN = '#000000';

const FILTER_ID = 'ln-ext-black-pieces';

const TONES: readonly Swatch[] = [
  { color: AS_DRAWN, name: 'As drawn' },
  { color: '#2f3238', name: 'Charcoal' },
  { color: '#474d5a', name: 'Slate' },
  { color: '#5f6878', name: 'Steel' },
  { color: '#4a3a2e', name: 'Walnut' },
];

const listeners = new Set<() => void>();

export const readBlackPieces = (): string =>
  readStored(StorageKey.blackPieces, HexSchema) ?? AS_DRAWN;

/** Each channel's table for `feFuncR`, `feFuncG` and `feFuncB`: black to `color`, white kept. */
export function tintTables(color: string): readonly [string, string, string] {
  const channel = (start: number): string => {
    const value = Number.parseInt(color.slice(start, start + 2), 16) / 255;
    return `${Number(value.toFixed(4))} 1`;
  };
  return [channel(1), channel(3), channel(5)];
}

type Funcs = readonly [SVGElement, SVGElement, SVGElement];

let funcs: Funcs | null = null;

// Not `display: none`, which leaves Firefox without the filter.
function filterFuncs(): Funcs {
  if (funcs?.[0].isConnected) return funcs;
  const svg = createSvgElement('svg', { class: 'ln-ext-filters', 'aria-hidden': 'true' });
  const filter = createSvgElement('filter', {
    id: FILTER_ID,
    'color-interpolation-filters': 'sRGB',
  });
  const transfer = createSvgElement('feComponentTransfer');
  const made: Funcs = [
    createSvgElement('feFuncR', { type: 'table' }),
    createSvgElement('feFuncG', { type: 'table' }),
    createSvgElement('feFuncB', { type: 'table' }),
  ];
  transfer.append(...made);
  filter.append(transfer);
  svg.append(filter);
  document.body.append(svg);
  funcs = made;
  return made;
}

// The filter goes in <body>, before the attribute that names it: a filter that isn't there yet
// would hide the pieces in Firefox.
function show(): void {
  onHeadParsed(() => {
    const color = readBlackPieces();
    const root = document.documentElement;
    if (color === AS_DRAWN) {
      setData(root, 'lnExtBlackPieces', null);
      return;
    }
    const [red, green, blue] = filterFuncs();
    const [redTable, greenTable, blueTable] = tintTables(color);
    red.setAttribute('tableValues', redTable);
    green.setAttribute('tableValues', greenTable);
    blue.setAttribute('tableValues', blueTable);
    setData(root, 'lnExtBlackPieces', '');
  });
}

function changed(): void {
  show();
  for (const listener of listeners) listener();
}

/** Shows the color, then again each time another tab changes it. */
export function followBlackPieces(): void {
  show();
  onStoredElsewhere([StorageKey.blackPieces], changed);
}

export function chooseBlackPieces(color: string): void {
  writeStored(StorageKey.blackPieces, color);
  changed();
}

/** The row under the piece sets, Lichess's or the extension's alike. */
export const blackPiecesRow = (): HTMLElement =>
  swatchRow({
    label: 'Black pieces',
    swatches: TONES,
    read: readBlackPieces,
    choose: chooseBlackPieces,
    onChange: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
