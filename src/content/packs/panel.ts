import { createElement, queryAll, setData } from '#shared/dom.ts';
import { LICHESS, type Library } from './library.ts';
import type { PartKind } from '#shared/packs/pack.ts';
import { choiceSection } from './choices.ts';

// The Extension / Lichess tabs added to the user menu's Board, Piece set and
// Sound panels (styles/sidebar/dasher-pickers.css).

export type View = 'extension' | typeof LICHESS;

const TABS: readonly (readonly [View, string])[] = [
  ['extension', 'Extension'],
  [LICHESS, 'Lichess'],
];

export const viewOf = (pick: string): View => (pick === LICHESS ? LICHESS : 'extension');

/** Lichess's panel for a part: `.sub.board`, `.sub.piece`, `.sub.sound`. */
export const panelSelector = (kind: PartKind): string => `#dasher_app .sub.${kind}`;

/**
 * Rings the current pick, in its own tab only: while the extension's is on,
 * Lichess's current board isn't the one the page shows.
 */
export function markPanel(panel: HTMLElement, kind: PartKind, library: Library): void {
  const current = library.current(kind);
  setData(panel, 'cdcSrcOn', viewOf(current));
  for (const item of queryAll(panel, '.cdc-src-item', HTMLElement))
    item.classList.toggle('active', item.dataset.cdcChoice === current);
}

function showView(panel: HTMLElement, view: View): void {
  setData(panel, 'cdcView', view);
  for (const tab of queryAll(panel, '.cdc-src-tabs button', HTMLElement))
    tab.classList.toggle('active', tab.dataset.cdcTab === view);
}

function tabBar(onTab: (view: View) => void): HTMLElement {
  const bar = createElement('div', { className: 'cdc-src-tabs' });
  for (const [view, label] of TABS) {
    const tab = createElement('button', {
      text: label,
      attrs: { type: 'button', class: '', 'data-cdc-tab': view },
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
 * Puts the tabs after the panel's title and the extension's choices after
 * them, or, in the Sound panel, beside the volume slider. Snabbdom leaves alone the nodes it
 * didn't create, so ours can sit among Lichess's.
 */
export function dressPanel(panel: HTMLElement, options: DressOptions): void {
  const { kind, library, view } = options;
  for (const ours of queryAll(panel, '.cdc-src-tabs, .cdc-src-choices', HTMLElement)) ours.remove();
  const tabs = tabBar(next => {
    options.onTab(next);
    showView(panel, next);
  });
  panel.querySelector(':scope > .head')?.after(tabs);
  const section = choiceSection(kind, library);
  const content = kind === 'sound' ? panel.querySelector(':scope > .content') : null;
  if (content) content.append(section);
  else tabs.after(section);
  markPanel(panel, kind, library);
  showView(panel, view);
}
