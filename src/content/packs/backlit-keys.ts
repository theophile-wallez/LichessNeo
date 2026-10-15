import {
  BACKLIT,
  type BacklitBoardId,
  isBacklitBoard,
  type KeyBox,
  keyBox,
} from '#shared/backlit.ts';
import { queryAll, setData, setStyleProperty } from '#shared/dom.ts';
import { readBacklit } from './options.ts';

// The backlit boards' keys (styles/board/backlit.css), drawn in the shape the
// settings give them (options.ts): an SVG tile of 2×2 squares, light top left,
// each a key inset in its square on the board's frame, shaded top to bottom,
// with a lit top edge and a dark bottom one. Each board has its colors for
// both schemes, Lichess's light one in pale keys, and its own light, for the
// light picked as "Board". page/backlit lights the keys in the same shape.

type Shade = readonly [top: string, bottom: string];

interface SchemeKeys {
  readonly light: Shade;
  readonly dark: Shade;
  readonly frame: string;
  readonly tint: string;
}

type Scheme = 'dark' | 'light';

// On the light scheme the keys are pale and the light deeper: a pale light won't show on them.
const KEYS: Readonly<Record<BacklitBoardId, Readonly<Record<Scheme, SchemeKeys>>>> = {
  [BACKLIT]: {
    dark: {
      light: ['#5d6372', '#4e5361'],
      dark: ['#2f333d', '#262931'],
      frame: '#0c0d10',
      tint: '#dfe6ff',
    },
    light: {
      light: ['#f2f3f7', '#e6e8ee'],
      dark: ['#b7bdca', '#a9b0be'],
      frame: '#8d94a3',
      tint: '#4c5bd4',
    },
  },
  'backlit-midnight': {
    dark: {
      light: ['#4f5f8c', '#43517a'],
      dark: ['#1f2742', '#192036'],
      frame: '#080b16',
      tint: '#8aa2ff',
    },
    light: {
      light: ['#eef1fb', '#e1e6f6'],
      dark: ['#a7b4db', '#98a7d2'],
      frame: '#7b8aba',
      tint: '#3550e8',
    },
  },
  'backlit-forest': {
    dark: {
      light: ['#61806a', '#52705b'],
      dark: ['#2a3b30', '#223128'],
      frame: '#0a100c',
      tint: '#8be9b0',
    },
    light: {
      light: ['#eef5ef', '#e1ece3'],
      dark: ['#a7c3ad', '#98b79f'],
      frame: '#7d9d85',
      tint: '#16904c',
    },
  },
  'backlit-walnut': {
    dark: {
      light: ['#8a6a4f', '#785b43'],
      dark: ['#3d2c20', '#33251b'],
      frame: '#120c08',
      tint: '#ffb86c',
    },
    light: {
      light: ['#f7f0e7', '#eee3d5'],
      dark: ['#cfb399', '#c3a589'],
      frame: '#a5886d',
      tint: '#d96c00',
    },
  },
  'backlit-amethyst': {
    dark: {
      light: ['#6c5a8e', '#5d4d7c'],
      dark: ['#2e2640', '#262035'],
      frame: '#0d0a14',
      tint: '#ff79c6',
    },
    light: {
      light: ['#f4f0fa', '#e9e2f4'],
      dark: ['#c0b0d8', '#b2a0ce'],
      frame: '#9886b7',
      tint: '#c2187a',
    },
  },
  'backlit-panda': {
    dark: {
      light: ['#c4c8d0', '#b3b8c2'],
      dark: ['#3d414b', '#343842'],
      frame: '#14161a',
      tint: '#bd93f9',
    },
    light: {
      light: ['#f0f1f4', '#e3e5ea'],
      dark: ['#5c616d', '#525763'],
      frame: '#383b43',
      tint: '#7c4dff',
    },
  },
};

const gradient = (id: string, [top, bottom]: Shade): string =>
  `<linearGradient id='${id}' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='${top}'/><stop offset='1' stop-color='${bottom}'/></linearGradient>`;

const EDGE =
  "<linearGradient id='e' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='.12'/><stop offset='.5' stop-color='#fff' stop-opacity='0'/><stop offset='1' stop-color='#000' stop-opacity='.35'/></linearGradient>";

// Hundredths of a square, rounded as the SVG needs no more.
const units = (fraction: number): string => String(Math.round(fraction * 10_000) / 100);

function key(x: number, y: number, fill: string, box: KeyBox): string {
  const place = `x='${units(x + box.inset)}' y='${units(y + box.inset)}' width='${units(box.size)}' height='${units(box.size)}' rx='${units(box.radius)}'`;
  return `<rect ${place} fill='url(#${fill})'/><rect ${place} fill='none' stroke='url(#e)' stroke-width='1'/>`;
}

/** The tile of `keys` in the shape `box`, as a CSS image. */
export function keysImage(keys: SchemeKeys, box: KeyBox): string {
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><defs>" +
    gradient('l', keys.light) +
    gradient('d', keys.dark) +
    EDGE +
    `</defs><rect width='200' height='200' fill='${keys.frame}'/>` +
    key(0, 0, 'l', box) +
    key(1, 0, 'd', box) +
    key(0, 1, 'd', box) +
    key(1, 1, 'l', box) +
    '</svg>';
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Gives `element` the keys and the light of the board `id`, for both schemes. */
function paintKeys(element: HTMLElement, id: BacklitBoardId, box: KeyBox): void {
  for (const scheme of ['dark', 'light'] as const) {
    const keys = KEYS[id][scheme];
    setStyleProperty(element, `--lr-ext-backlit-keys-${scheme}`, keysImage(keys, box));
    setStyleProperty(element, `--lr-ext-backlit-tint-${scheme}`, keys.tint);
  }
}

/** Shows the board `id`'s keys on <html>, and the last move's outline in their shape. */
export function showKeys(id: BacklitBoardId, box: KeyBox): void {
  const root = document.documentElement;
  paintKeys(root, id, box);
  setStyleProperty(root, '--lr-ext-backlit-inset', `${box.inset * 100}%`);
  // A percentage of the outline's own box, which is the key.
  setStyleProperty(root, '--lr-ext-backlit-radius', `${(box.radius / box.size) * 100}%`);
}

/** Paints the backlit tiles under `root` (the user menu's, the settings') not yet in the shape picked. */
export function paintTiles(root: ParentNode = document): void {
  const box = keyBox(readBacklit().shape);
  const shape = `${box.inset} ${box.radius}`;
  for (const thumb of queryAll(
    root,
    ".lr-ext-src-thumb[data-lr-ext-theme^='backlit']",
    HTMLElement,
  )) {
    const id = thumb.dataset.lrExtTheme ?? '';
    const painted = `${id} ${shape}`;
    if (!isBacklitBoard(id) || thumb.dataset.lrExtPainted === painted) continue;
    paintKeys(thumb, id, box);
    setData(thumb, 'lrExtPainted', painted);
  }
}
