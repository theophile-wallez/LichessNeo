import { closestTo, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { LayoutId } from './layout.ts';

// The little Lichess's menu, as the extension's sidebar answers
// (content/sidebar/collapse.ts, sections.ts): the toggle folds the sidebar to
// its icons, and in the unfolded sidebar a section's row folds its pages open
// or shut. Its column's width, and a fold, animate only while marked so: a
// layout picked or the toggle (`data-moving`), a section's row (`data-folding`).

// A little past each transition: the toggle's 0.28s, a layout's 0.5s, a row's 0.32s.
const TOGGLE_MS = 400;
const LAYOUT_MS = 550;
const FOLD_MS = 400;
const timers = new WeakMap<HTMLElement, Record<string, number>>();

/** Sets `name` on `mock` for `ms`; a second run mid-way keeps it for its own. */
function markFor(mock: HTMLElement, name: string, value: string, ms: number): void {
  const running = timers.get(mock) ?? {};
  timers.set(mock, running);
  setData(mock, name, value);
  window.clearTimeout(running[name]);
  running[name] = window.setTimeout(() => setData(mock, name, null), ms);
}

let collapsed = false;

/** Draws the menu in `mock`'s layout, folded if the toggle says so and the layout can be. */
function showMenu(mock: HTMLElement): void {
  const shape = mock.dataset.shape;
  const folded = collapsed && (shape === 'sidebar' || shape === 'unfolded');
  setData(mock, 'folded', folded ? '' : null);
  queryOne(mock, '.menu', HTMLElement)?.classList.toggle('menu--named', folded || shape === 'rail');
  const toggle = queryOne(mock, '.menu-toggle', HTMLButtonElement);
  toggle?.setAttribute('aria-label', collapsed ? 'Expand the sidebar' : 'Collapse the sidebar');
  toggle?.setAttribute('aria-expanded', String(!collapsed));
}

/** Shows `mock` in `layout`, its menu's column sliding to its new width. */
export function showLayout(mock: HTMLElement, layout: LayoutId): void {
  if (mock.dataset.shape === layout) return;
  markFor(mock, 'moving', 'layout', LAYOUT_MS);
  mock.dataset.shape = layout;
  showMenu(mock);
}

/** Folds `section` open or shut; until the first fold, the page's own section is open. */
function fold(mock: HTMLElement, section: HTMLElement): void {
  const sections = queryAll(mock, '.menu-section', HTMLElement);
  for (const each of sections)
    each.dataset.open ??= each.classList.contains('menu-section--on') ? 'open' : 'shut';
  section.dataset.open = section.dataset.open === 'open' ? 'shut' : 'open';
  markFor(mock, 'folding', '', FOLD_MS);
}

function onClick(event: MouseEvent): void {
  const mock = closestTo(event.target, '.mock', HTMLElement);
  if (!mock) return;
  if (closestTo(event.target, '.menu-toggle', HTMLButtonElement)) {
    collapsed = !collapsed;
    markFor(mock, 'moving', 'fold', TOGGLE_MS);
    showMenu(mock);
    return;
  }
  const link = closestTo(event.target, '.menu-link', HTMLButtonElement);
  const section = closestTo(link, '.menu-section', HTMLElement);
  if (section && mock.dataset.shape === 'unfolded' && !mock.dataset.folded) fold(mock, section);
}

export function startMenus(): void {
  for (const mock of queryAll(document, '.mock', HTMLElement)) showMenu(mock);
  document.addEventListener('click', onClick);
}
