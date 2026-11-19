import { closestTo, queryOne, setData } from '#shared/dom.ts';

// The panel under the tiles as it changes, to the side's or the time control's, or to
// another time control tab, which Lichess redraws in place: it eases from its old
// height to its new one (clipped meanwhile, setup-panels.css) while what's new fades
// in. Plain animations, which leave no style behind: the panel keeps its own height.

const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const FADE_MS = 240;
const RESIZE_MS = 300;
const PANELS = ['time', 'side'] as const;

interface Shown {
  readonly panel: HTMLElement;
  /** The time control's tab, -1 for the side. */
  readonly tab: number;
}

interface Seen extends Shown {
  /** Its height at rest, where the next change starts from. */
  readonly height: number;
}

const seen = new WeakMap<HTMLElement, Seen>();
const resizings = new WeakMap<HTMLElement, Animation>();

const heightOf = (element: HTMLElement): number => element.getBoundingClientRect().height;

function stopResizing(panel: HTMLElement): void {
  resizings.get(panel)?.cancel();
  resizings.delete(panel);
  setData(panel, 'lnExtResizing', null);
}

function resize(panel: HTMLElement, from: number, to: number): void {
  if (Math.abs(from - to) < 1) return;
  setData(panel, 'lnExtResizing', '');
  const resizing = panel.animate([{ height: `${from}px` }, { height: `${to}px` }], {
    duration: RESIZE_MS,
    easing: EASING,
  });
  resizings.set(panel, resizing);
  resizing.addEventListener('finish', () => {
    if (resizings.get(panel) === resizing) stopResizing(panel);
  });
}

function tabOf(panel: HTMLElement): number {
  const active = queryOne(panel, '.tabs-horiz button.active', HTMLElement);
  return active ? [...(active.parentElement?.children ?? [])].indexOf(active) : -1;
}

function shownIn(content: HTMLElement, root: HTMLElement): Shown | null {
  const name = PANELS.find(panel => panel === root.dataset.lnExtOpen);
  const panel = name
    ? queryOne(content, `:scope > [data-ln-ext-setup-part="${name}"]`, HTMLElement)
    : null;
  if (!panel) return null;
  return { panel, tab: name === 'time' ? tabOf(panel) : -1 };
}

/** Eases the panel and fades in what's new: all of it, or a tab's content alone. */
function enter(before: Seen, shown: Shown, from: number, to: number): void {
  const switched = before.panel !== shown.panel;
  const arriving = switched
    ? [...shown.panel.children]
    : [queryOne(shown.panel, '.time-panel', HTMLElement)];
  resize(shown.panel, from, to);
  for (const element of arriving) {
    element?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: FADE_MS,
      easing: EASING,
    });
  }
}

/** Moves to what's shown now, from what was. */
function change(root: HTMLElement, before: Seen | undefined, shown: Shown): void {
  // From where it is if it's still on its way, else from where it last rested.
  const midway = resizings.has(shown.panel) && before?.panel === shown.panel;
  const from = midway ? heightOf(shown.panel) : before?.height;
  if (before) stopResizing(before.panel);
  stopResizing(shown.panel);
  const to = heightOf(shown.panel);
  seen.set(root, { ...shown, height: to });
  if (!before || from === undefined) return;
  if (closestTo(root, 'dialog', HTMLDialogElement)?.open) enter(before, shown, from, to);
}

/** Animates the open setup's panel as it changes. */
export function syncPanelMotion(): void {
  const content = queryOne(document, 'dialog .game-setup > .setup-content', HTMLElement);
  const root = content ? queryOne(content, ':scope > .ln-ext-setup', HTMLElement) : null;
  const shown = content && root ? shownIn(content, root) : null;
  if (!root || !shown) return;
  const before = seen.get(root);
  if (before?.panel !== shown.panel || before.tab !== shown.tab) {
    change(root, before, shown);
  } else if (!resizings.has(shown.panel)) {
    seen.set(root, { ...shown, height: heightOf(shown.panel) });
  }
}
