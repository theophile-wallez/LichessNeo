import { createElement, queryAll, setData } from '#shared/dom.ts';
import { isPackId, LICHESS, type Library } from './library.ts';
import type { PartKind } from '#shared/packs/pack.ts';
import { choiceSection, importedSection } from './choices.ts';
import { markFamilies } from './family.ts';
import { showOptionRows } from './option-row.ts';
import { FOOT_ROWS } from './options.ts';

// The Extension / Packs / Lichess tabs added to the user menu's Board, Piece
// set and Sound panels (styles/sidebar/dasher-pickers.css): the extension's
// own looks, the packs the user imported, and Lichess's, each apart.

export type View = 'extension' | 'packs' | typeof LICHESS;

const TABS: readonly (readonly [View, string])[] = [
  ['extension', 'Extension'],
  ['packs', 'Packs'],
  [LICHESS, 'Lichess'],
];

export function viewOf(pick: string): View {
  if (pick === LICHESS) return LICHESS;
  return isPackId(pick) ? 'packs' : 'extension';
}

/** Lichess's panel for a part: `.sub.board`, `.sub.piece`, `.sub.sound`. */
export const panelSelector = (kind: PartKind): string => `#dasher_app .sub.${kind}`;

/**
 * Rings the current pick, in its own tab only: while the extension's or a
 * pack's is on, Lichess's current board isn't the one the page shows.
 */
export function markPanel(panel: HTMLElement, kind: PartKind, library: Library): void {
  const current = library.current(kind);
  setData(panel, 'lnExtSrcOn', current === LICHESS ? LICHESS : 'extension');
  for (const item of queryAll(panel, '.ln-ext-src-item[data-ln-ext-choice]', HTMLElement))
    item.classList.toggle('active', item.dataset.lnExtChoice === current);
  markFamilies(panel, kind, current);
  showOptionRows(panel, current);
}

function showView(panel: HTMLElement, view: View): void {
  setData(panel, 'lnExtView', view);
  for (const tab of queryAll(panel, '.ln-ext-src-tabs button', HTMLElement))
    tab.classList.toggle('active', tab.dataset.lnExtTab === view);
}

function tabBar(onTab: (view: View) => void): HTMLElement {
  const bar = createElement('div', { className: 'ln-ext-src-tabs' });
  for (const [view, label] of TABS) {
    const tab = createElement('button', {
      text: label,
      attrs: { type: 'button', class: '', 'data-ln-ext-tab': view },
    });
    tab.addEventListener('click', () => onTab(view));
    bar.append(tab);
  }
  return bar;
}

export interface DressOptions {
  readonly kind: PartKind;
  readonly library: Library;
  readonly view: View;
  readonly onTab: (view: View) => void;
}

/**
 * Puts the tabs after the panel's title and the extension's choices and the
 * packs after them, or, in the Sound panel, beside the volume slider, and the
 * rows of every tab at the foot. Snabbdom leaves alone the nodes it didn't
 * create, so ours can sit among Lichess's.
 */
export function dressPanel(panel: HTMLElement, options: DressOptions): void {
  const { kind, library, view } = options;
  for (const ours of queryAll(
    panel,
    '.ln-ext-src-tabs, .ln-ext-src-choices, .ln-ext-src-packs, .ln-ext-src-foot',
    HTMLElement,
  ))
    ours.remove();
  const tabs = tabBar(next => {
    options.onTab(next);
    showView(panel, next);
  });
  panel.querySelector(':scope > .head')?.after(tabs);
  const sections = [choiceSection(kind, library), importedSection(kind, library)];
  const content = kind === 'sound' ? panel.querySelector(':scope > .content') : null;
  if (content) content.append(...sections);
  else tabs.after(...sections);
  const foot = FOOT_ROWS[kind];
  if (foot.length > 0) {
    const rows = createElement('div', { className: 'ln-ext-src-foot' });
    rows.append(...foot.map(row => row()));
    panel.append(rows);
  }
  markPanel(panel, kind, library);
  showView(panel, view);
}
