import { queryOne } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { GOOD } from '#page/review/classes/classes.ts';
import type { InterfaceStrings } from '#page/review/i18n/types.ts';
import type { JudgedMove, LineShown, Session } from '#page/review/session.ts';
import { explainHint } from './explain-hint.ts';
import { type IconName, svgIcon } from './markup.ts';
import { stepPath } from './navigation.ts';
import { canRetry, type RetryOutcome } from './retry.ts';

// The Explain / Best / Retry / Next buttons under the coach. They're kept across the
// panel's renders and changed in place, so that a button with nothing to do
// can fold away and Next ease into its room (review/bubble.css).

export interface NavState {
  readonly explain: { readonly on: boolean; readonly enabled: boolean };
  readonly best: { readonly on: boolean; readonly enabled: boolean };
  readonly retry: { readonly on: boolean; readonly enabled: boolean };
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
  // Retrying, Next goes on with the game, Retry back onto the error; Explain and Best would
  // give the answer away. Each folds away where it has nothing to add.
  const canBest =
    !retried && !line && (shown !== null || (move?.best && !GOOD.has(move.moveClass)));
  // Explain stays while its line is on the board, so it can be put away.
  const canExplain =
    !retried && (line !== null || (move !== null && explainHint(session, move).length > 0));
  return {
    explain: { on: session.view.explain, enabled: canExplain },
    best: { on: shown !== null, enabled: Boolean(canBest) },
    retry: { on: retried !== null, enabled: retried !== null || canRetry(move, analysis) },
    next: { enabled: Boolean(retried) || Boolean(stepPath(session, analysis, 1)) },
  };
}

// The markup each part of the panel was drawn from: a part drawn the same is kept.
const drawnFrom = new WeakMap<Element, string>();

/**
 * Fills the panel but for its kept nav, left in place, last, for its buttons
 * to ease. A part whose markup didn't change stays as it is (the header, the
 * key moments): only what changed is laid out again.
 */
export function fillAroundNav(panel: HTMLElement, markup: SafeHtml, nav: HTMLElement): void {
  const template = document.createElement('template');
  setHtml(template, markup);
  if (nav.parentNode !== panel) panel.replaceChildren(nav);
  while (nav.nextSibling) nav.nextSibling.remove();
  for (const node of panel.childNodes) if (!(node instanceof Element)) node.remove();
  const drawn = [...panel.children].filter(child => child !== nav);
  const parts = [...template.content.children];
  for (const [i, part] of parts.entries()) {
    const source = part.outerHTML;
    const old = drawn[i];
    if (old && drawnFrom.get(old) === source) continue;
    drawnFrom.set(part, source);
    if (old) old.replaceWith(part);
    else nav.before(part);
  }
  for (const extra of drawn.slice(parts.length)) extra.remove();
}

type NavButton = keyof NavState;

function button(nav: HTMLElement, name: NavButton): HTMLButtonElement | null {
  return queryOne(nav, `[data-ln-ext="${name}"]`, HTMLButtonElement);
}

/** Draws the buttons once per language, then only changes what changed. */
export function syncNav(nav: HTMLElement, state: NavState, ui: InterfaceStrings): void {
  const labels = [ui.explain, ui.best, ui.retry.button, ui.next].join('|');
  if (nav.dataset.lnExtLabels !== labels) {
    nav.dataset.lnExtLabels = labels;
    setHtml(
      nav,
      html`${navButton('explain', 'bulb', ui.explain)}${navButton('best', 'star', ui.best)}
        ${navButton('retry', 'retry', ui.retry.button)}
        <button class="ln-ext-btn ln-ext-btn--green" data-ln-ext="next" aria-label="${ui.next}">${svgIcon('arrow')}<span>${ui.next}</span></button>`,
    );
  }
  for (const name of ['explain', 'best', 'retry', 'next'] as const) {
    const element = button(nav, name);
    if (!element) continue;
    const { enabled } = state[name];
    if (element.disabled === enabled) element.disabled = !enabled;
    if (name !== 'next') element.classList.toggle('ln-ext-btn--on', state[name].on);
  }
  // A narrow panel has no room for four names: Next keeps only its arrow (review/bubble.css).
  const four = state.explain.enabled && state.best.enabled && state.retry.enabled;
  nav.classList.toggle('ln-ext-review__nav--four', four);
}

const navButton = (name: Exclude<NavButton, 'next'>, icon: IconName, label: string): SafeHtml =>
  html`<button class="ln-ext-btn" data-ln-ext="${name}">${svgIcon(icon)}${label}</button>`;
