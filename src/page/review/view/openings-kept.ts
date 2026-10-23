import { createElement, queryAll } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import type { Session } from '#page/review/session.ts';

// The practice page's parts that are made once and put back into each of its
// renders, in place of a slot (`data-ln-ext-slot`): its search field, which
// keeps its focus and caret, and its choices, whose pick slides
// (content/ui/tab-bars.ts).

const parts = new WeakMap<Session, Map<string, HTMLElement>>();

/** The part kept as `name`, made the first time. */
export function keptPart(session: Session, name: string, make: () => HTMLElement): HTMLElement {
  let kept = parts.get(session);
  if (!kept) {
    kept = new Map();
    parts.set(session, kept);
  }
  const part = kept.get(name) ?? make();
  kept.set(name, part);
  return part;
}

export const slot = (name: string): SafeHtml => html`<span data-ln-ext-slot="${name}"></span>`;

/**
 * Fills the panel with `markup`, the kept parts in place of their slots. Taken
 * out and put back, a field loses its focus: it gets it back, its caret where it was.
 */
export function fillKeeping(
  panel: HTMLElement,
  markup: SafeHtml,
  placed: Readonly<Record<string, HTMLElement>>,
): void {
  const focused = document.activeElement;
  const field = focused instanceof HTMLInputElement ? focused : null;
  const start = field?.selectionStart ?? null;
  const end = field?.selectionEnd ?? null;
  setHtml(panel, markup);
  for (const target of queryAll(panel, '[data-ln-ext-slot]', HTMLElement)) {
    const part = placed[target.dataset.lnExtSlot ?? ''];
    if (part) target.replaceWith(part);
  }
  if (!field?.isConnected || document.activeElement === field) return;
  field.focus({ preventScroll: true });
  if (start !== null && end !== null) field.setSelectionRange(start, end);
}

export interface Choice {
  readonly value: string;
  readonly label: SafeHtml;
}

/** A row of choices, kept as `name`: drawn again only for other labels, its pick changed in place. */
export function choiceBar(
  session: Session,
  name: string,
  row: { readonly options: readonly Choice[]; readonly picked: string | null },
): HTMLElement {
  const bar = keptPart(session, name, () =>
    createElement('div', { className: 'ln-ext-seg', attrs: { role: 'group' } }),
  );
  const markup = html`${row.options.map(
    ({ value, label }) =>
      html`<button class="ln-ext-seg__opt" data-ln-ext="${name}" data-ln-ext-value="${value}">${label}</button>`,
  )}`;
  const drawn = markup.value;
  if (bar.dataset.lnExtDrawn !== drawn) {
    setHtml(bar, markup);
    bar.dataset.lnExtDrawn = drawn;
  }
  // `active` as the other bars that slide mark their tab (content/ui/tab-bars.ts).
  for (const button of queryAll(bar, 'button', HTMLButtonElement)) {
    const picked = button.dataset.lnExtValue === row.picked;
    button.classList.toggle('active', picked);
    if (button.getAttribute('aria-pressed') !== String(picked))
      button.setAttribute('aria-pressed', String(picked));
  }
  return bar;
}
