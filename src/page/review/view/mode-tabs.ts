import Share08Icon from '@hugeicons/core-free-icons/Share08Icon';
import { queryAll, queryOne } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import type { InterfaceStrings } from '#page/review/i18n/types.ts';
import type { Mode, Session } from '#page/review/session.ts';
import { newGameMarkup } from './new-game.ts';

// A game's three views, as tabs at the head of the right-hand column: the summary, the
// move-by-move debrief and Lichess's own panel, side by side rather than one behind the
// other, with the same buttons at their right in each. Kept across renders, so that the
// pick slides (content/ui/tab-bars.ts); the buttons are drawn again only when they change.

const TABS = ['summary', 'moves', 'normal'] as const satisfies readonly Mode[];
type Tab = (typeof TABS)[number];

const SHARE_ICON = hugeicon(Share08Icon);

const labelOf = (tab: Tab, ui: InterfaceStrings): string =>
  ({ summary: ui.summary, moves: ui.review, normal: ui.moves })[tab];

const shareMarkup = (open: boolean, ui: InterfaceStrings): SafeHtml =>
  html`<button class="ln-ext-review__share${open ? ' active' : ''}" data-ln-ext="share" data-ln-ext-tip="${ui.share}" aria-label="${ui.share}" aria-pressed="${String(open)}">${SHARE_ICON}</button>`;

/** The same in every mode: the game's sheet, and a new game like this one. */
const actionsMarkup = (session: Session, analysis: Analysis): SafeHtml =>
  html`${shareMarkup(session.view.sheet, session.language.ui)}${newGameMarkup(analysis, 'ln-ext-review__new')}`;

const drawn = new WeakMap<HTMLElement, string>();

export function syncModeTabs(session: Session, analysis: Analysis): void {
  const { modes } = session.elements;
  const { ui } = session.language;
  if (!modes.firstElementChild)
    setHtml(
      modes,
      html`<div class="ln-ext-review-modes__tabs" role="tablist">${TABS.map(
        tab =>
          html`<button type="button" role="tab" data-ln-ext="${tab}">${labelOf(tab, ui)}</button>`,
      )}</div><div class="ln-ext-review-modes__actions"></div>`,
    );
  for (const button of queryAll(modes, '[role="tab"]', HTMLButtonElement)) {
    const picked = button.dataset.lnExt === session.view.mode;
    button.classList.toggle('active', picked);
    if (button.getAttribute('aria-selected') !== String(picked))
      button.setAttribute('aria-selected', String(picked));
  }
  const actions = queryOne(modes, '.ln-ext-review-modes__actions', HTMLElement);
  const markup = actionsMarkup(session, analysis);
  if (actions && drawn.get(actions) !== markup.value) {
    drawn.set(actions, markup.value);
    setHtml(actions, markup);
  }
}
