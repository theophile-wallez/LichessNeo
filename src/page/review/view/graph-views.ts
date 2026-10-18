import ChartLineData01Icon from '@hugeicons/core-free-icons/ChartLineData01Icon';
import Clock01Icon from '@hugeicons/core-free-icons/Clock01Icon';
import { queryAll } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { html, setHtml } from '#shared/html.ts';
import type { InterfaceStrings } from '#page/review/i18n/types.ts';
import { type GraphView, GraphViewSchema } from '#page/review/session.ts';

// The move-by-move graph's two views, over its corner. Kept across the panel's
// renders, so that the pick slides from one to the other (content/ui/tab-bars.ts).

const ICONS = { advantage: ChartLineData01Icon, time: Clock01Icon } as const;

export interface GraphViewsState {
  readonly shown: GraphView;
  /** The game has move times to show. */
  readonly hasTimes: boolean;
}

export function syncGraphViews(
  element: HTMLElement,
  { shown, hasTimes }: GraphViewsState,
  ui: InterfaceStrings,
): void {
  if (!element.firstElementChild)
    setHtml(
      element,
      html`${GraphViewSchema.options.map(
        view =>
          html`<button type="button" data-lr-ext="graph" data-lr-ext-view="${view}">${hugeicon(ICONS[view], { className: 'lr-ext-i' })}${ui.graphViews[view]}</button>`,
      )}`,
    );
  if (element.hidden === hasTimes) element.hidden = !hasTimes;
  for (const button of queryAll(element, 'button', HTMLButtonElement)) {
    const picked = button.dataset.lrExtView === shown;
    button.classList.toggle('active', picked);
    if (button.getAttribute('aria-pressed') !== String(picked))
      button.setAttribute('aria-pressed', String(picked));
  }
}

/** The view a button of the toggle stands for. */
export function viewOf(button: HTMLElement): GraphView | null {
  const parsed = GraphViewSchema.safeParse(button.dataset.lrExtView);
  return parsed.success ? parsed.data : null;
}
