import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { GOOD } from '#page/review/classes/classes.ts';
import type { InterfaceStrings } from '#page/review/i18n/types.ts';
import type { JudgedMove, LineShown, Session } from '#page/review/session.ts';
import { explainHint } from './explain-hint.ts';
import { svgIcon } from './markup.ts';
import { stepPath } from './navigation.ts';
import type { RetryOutcome } from './retry.ts';

// The Explain / Best / Next buttons under the coach. They're kept across the
// panel's renders and changed in place, so that a button with nothing to do
// can fold away and Next ease into its room (review/bubble.css).

export interface NavState {
  readonly explain: { readonly on: boolean; readonly enabled: boolean };
  readonly best: { readonly on: boolean; readonly enabled: boolean };
  readonly next: { readonly enabled: boolean };
}

/** What the panel shows of the move on the board, as far as the buttons go. */
export interface NavInput {
  /** Explain's best line, when the board is along it. */
  readonly line: LineShown | null;
  readonly move: JudgedMove | null;
  /** The engine's best move, played in place of the move on the board. */
  readonly shown: JudgedMove | null;
  /** Where a retry stands, while the player retries an error. */
  readonly retried: RetryOutcome | null;
}

export function navState(session: Session, analysis: Analysis, input: NavInput): NavState {
  const { line, move, shown, retried } = input;
  // Retrying, Next goes on with the game; Explain and Best would give the answer away.
  // Either folds away where it has nothing to add.
  const canBest =
    !retried && !line && (shown !== null || (move?.best && !GOOD.has(move.moveClass)));
  // Explain stays while its line is on the board, so it can be put away.
  const canExplain =
    !retried && (line !== null || (move !== null && explainHint(session, move).length > 0));
  return {
    explain: { on: session.view.explain, enabled: canExplain },
    best: { on: shown !== null, enabled: Boolean(canBest) },
    next: { enabled: Boolean(retried) || Boolean(stepPath(session, analysis, 1)) },
  };
}

/** Fills the panel but for its kept nav, left in place, last, for its buttons to ease. */
export function fillAroundNav(panel: HTMLElement, markup: SafeHtml, nav: HTMLElement): void {
  const template = document.createElement('template');
  setHtml(template, markup);
  if (nav.parentNode !== panel) panel.replaceChildren(nav);
  while (nav.previousSibling) nav.previousSibling.remove();
  while (nav.nextSibling) nav.nextSibling.remove();
  nav.before(template.content);
}

type NavButton = keyof NavState;

function button(nav: HTMLElement, name: NavButton): HTMLButtonElement | null {
  return queryOne(nav, `[data-ln-ext="${name}"]`, HTMLButtonElement);
}

/** Draws the buttons once per language, then only changes what changed. */
export function syncNav(nav: HTMLElement, state: NavState, ui: InterfaceStrings): void {
  const labels = [ui.explain, ui.best, ui.next].join('|');
  if (nav.dataset.lnExtLabels !== labels) {
    nav.dataset.lnExtLabels = labels;
    setHtml(
      nav,
      html`<button class="ln-ext-btn" data-ln-ext="explain">${svgIcon('bulb')}${ui.explain}</button>
        <button class="ln-ext-btn" data-ln-ext="best">${svgIcon('star')}${ui.best}</button>
        <button class="ln-ext-btn ln-ext-btn--green" data-ln-ext="next">${svgIcon('arrow')}${ui.next}</button>`,
    );
  }
  for (const name of ['explain', 'best', 'next'] as const) {
    const element = button(nav, name);
    if (!element) continue;
    const { enabled } = state[name];
    if (element.disabled === enabled) element.disabled = !enabled;
    if (name !== 'next') element.classList.toggle('ln-ext-btn--on', state[name].on);
  }
}
