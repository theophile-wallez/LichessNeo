import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { CORRESPONDENCE_GLYPH, parseMinutes, presetSpeed, SPEED_GLYPHS, speedOf } from './speed.ts';

// The game setup's choices as a row of tiles (styles/pages/setup-picks.css): the
// variant, the time control and the side, each showing its pick. The time control's
// and the side's tiles switch between their Lichess controls under the row, one
// always shown, the time control's first; the variant's opens its menu, as Lichess's
// own button did. The game mode stays Lichess's own control, over the row.

const PARTS = ['variant', 'time', 'side'] as const;
type Part = (typeof PARTS)[number];
/** Lichess's sections of the setup: the tiles' parts, the game mode and the computer's level. */
type Section = Part | 'mode' | 'level';
type Panel = 'time' | 'side';
const DEFAULT_PANEL: Panel = 'time';

/** What a tile shows: Lichess's glyph or a pick our stylesheet draws, and the pick's name. */
interface Shown {
  readonly glyph: string | null;
  readonly pick: string | null;
  readonly value: string;
}

interface Tile {
  readonly root: HTMLElement;
  readonly icon: HTMLElement;
  readonly caption: HTMLElement;
  readonly value: HTMLElement;
}

interface Picks {
  readonly root: HTMLElement;
  readonly tiles: ReadonlyMap<Part, Tile>;
}

const built = new WeakMap<HTMLElement, Picks>();

const textOf = (root: ParentNode, selector: string): string =>
  queryOne(root, selector, HTMLElement)?.textContent.trim() ?? '';

/** Lichess's sections of the setup, by the part each is. */
function findParts(content: HTMLElement): Map<Section, HTMLElement> {
  const parts = new Map<Section, HTMLElement>();
  const add = (part: Section, element: HTMLElement | null | undefined): void => {
    if (element) parts.set(part, element);
  };
  add('variant', queryOne(content, ':scope > .mselect', HTMLElement));
  add('time', queryOne(content, ':scope > .time-control-tabs', HTMLElement));
  add(
    'mode',
    closestTo(queryOne(content, '#sf_mode_casual', HTMLInputElement), '.config-group', HTMLElement),
  );
  add(
    'side',
    closestTo(queryOne(content, 'group.color-picker', HTMLElement), '.config-group', HTMLElement),
  );
  add(
    'level',
    closestTo(
      queryOne(content, 'input[name="level"]', HTMLInputElement),
      '.config-group',
      HTMLElement,
    ),
  );
  return parts;
}

function timeShown(time: HTMLElement): Shown {
  const tab = textOf(time, '.tabs-horiz button.active');
  const [minutes, increment] = queryAll(
    time,
    '.time-panel .sliders-grid .val-box',
    HTMLElement,
  ).map(box => box.textContent.trim());
  if (minutes !== undefined && increment !== undefined) {
    const initial = parseMinutes(minutes);
    const glyph = initial === null ? null : SPEED_GLYPHS[speedOf(initial, Number(increment))];
    return { glyph, pick: null, value: `${minutes}+${increment}` };
  }
  if (queryOne(time, '.time-panel .slider-container', HTMLElement)) {
    return { glyph: CORRESPONDENCE_GLYPH, pick: null, value: tab };
  }
  return { glyph: null, pick: 'unlimited', value: tab };
}

function checkedShown(part: HTMLElement): Shown {
  const checked = queryOne(part, 'group.radio input:checked', HTMLInputElement);
  const label = checked ? queryOne(part, `label[for="${checked.id}"]`, HTMLElement) : null;
  const value = (label && queryOne(label, '.text', HTMLElement)) ?? label;
  return { glyph: null, pick: checked?.value ?? null, value: value?.textContent.trim() ?? '' };
}

/** What a part's tile shows, read off Lichess's control. */
function shownOf(part: Part, element: HTMLElement): Shown {
  if (part === 'time') return timeShown(element);
  if (part === 'side') return checkedShown(element);
  const icon = queryOne(element, '.mselect__label .icon', HTMLElement);
  return {
    glyph: icon?.dataset.icon ?? null,
    pick: null,
    value: textOf(element, '.mselect__label .name'),
  };
}

/** The tile's caption: Lichess's own label for the section, else its translation. */
function captionOf(part: Part, element: HTMLElement): string {
  const own = textOf(element, ':scope > .label');
  if (own) return own;
  const { dataset } = document.documentElement;
  if (part === 'variant') return dataset.lnExtVariantLabel ?? '';
  return part === 'time' ? (dataset.lnExtTimeControlLabel ?? '') : '';
}

function buildTile(part: Part): Tile {
  // The variant's tile is its menu's toggle, as Lichess's own button was.
  const root =
    part === 'variant'
      ? createElement('label', { attrs: { for: 'mselect-variant' } })
      : createElement('button', { attrs: { type: 'button', 'aria-expanded': 'false' } });
  root.className = 'ln-ext-setup__tile';
  setData(root, 'lnExtPart', part);
  const icon = createElement('span', { className: 'ln-ext-setup__icon' });
  const caption = createElement('span', { className: 'ln-ext-setup__caption' });
  const value = createElement('span', { className: 'ln-ext-setup__value' });
  root.append(icon, caption, value);
  return { root, icon, caption, value };
}

function build(content: HTMLElement): Picks {
  const root = createElement('div', { className: 'ln-ext-setup' });
  const tiles = new Map(PARTS.map(part => [part, buildTile(part)]));
  root.append(...[...tiles.values()].map(tile => tile.root));
  root.addEventListener('click', event => {
    const part = closestTo(event.target, '[data-ln-ext-part]', HTMLElement)?.dataset.lnExtPart;
    if ((part !== 'time' && part !== 'side') || root.dataset.lnExtOpen === part) return;
    setData(root, 'lnExtOpen', part);
    // The panel shown as the setup opens comes in still; one switched to slides in.
    setData(root, 'lnExtSwitched', part);
  });
  content.prepend(root);
  const picks = { root, tiles };
  built.set(root, picks);
  return picks;
}

function showTile(tile: Tile, part: Part, element: HTMLElement | undefined): void {
  if (tile.root.hidden !== !element) tile.root.hidden = !element;
  if (!element) return;
  const shown = shownOf(part, element);
  setData(tile.icon, 'icon', shown.glyph);
  setData(tile.icon, 'lnExtPick', shown.pick);
  const caption = captionOf(part, element);
  if (tile.caption.textContent !== caption) tile.caption.textContent = caption;
  if (tile.value.textContent !== shown.value) tile.value.textContent = shown.value;
}

/** Each preset's speed, and the first of each, which starts its row (setup-picks.css). */
function markPresets(time: HTMLElement | undefined): void {
  let previous: string | null = null;
  for (const preset of time ? queryAll(time, '.presets .preset-btn', HTMLElement) : []) {
    const speed = presetSpeed(preset.textContent);
    setData(preset, 'lnExtSpeed', speed);
    setData(preset, 'lnExtFirst', speed !== previous ? '' : null);
    previous = speed;
  }
}

/** The open tile, the variant's while its menu is; the time control's if the side's is gone. */
function markOpen(content: HTMLElement, root: HTMLElement, tiles: ReadonlyMap<Part, Tile>): void {
  const shown = root.dataset.lnExtOpen;
  const open = shown === 'side' && tiles.get('side')?.root.hidden === false ? shown : DEFAULT_PANEL;
  setData(root, 'lnExtOpen', open);
  const menu = queryOne(content, '.mselect__toggle', HTMLInputElement)?.checked === true;
  for (const [part, tile] of tiles) {
    const expanded = part === 'variant' ? menu : open === part;
    setData(tile.root, 'lnExtExpanded', expanded ? '' : null);
    if (tile.root instanceof HTMLButtonElement && tile.root.ariaExpanded !== String(expanded)) {
      tile.root.ariaExpanded = String(expanded);
    }
  }
}

/** Keeps the tiles in the open setup in step with Lichess's controls. */
export function syncPicks(): void {
  const content = queryOne(document, 'dialog .game-setup > .setup-content', HTMLElement);
  if (!content) return;
  const existing = queryOne(content, ':scope > .ln-ext-setup', HTMLElement);
  const { root, tiles } = (existing && built.get(existing)) ?? build(content);
  const parts = findParts(content);
  for (const [part, element] of parts) setData(element, 'lnExtSetupPart', part);
  for (const [part, tile] of tiles) showTile(tile, part, parts.get(part));
  markOpen(content, root, tiles);
  markPresets(parts.get('time'));
}
