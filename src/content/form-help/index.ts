import { createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The help link some page forms open with ("Our tips for organizing events", "How to use
// Lichess Broadcasts") belongs to the page, not to the form: a copy of it stands at the end
// of the page's title, which a pinned title keeps in sight (styles/forms/help-link.css).
// Lichess renders these forms on the server, so it's done once per page.

export const HELP_CLASS = 'ln-ext-form-help';

let done: HTMLFormElement | null = null;

/** The help link a page form opens with, alone in its first group. */
function helpLink(form: HTMLFormElement): HTMLAnchorElement | null {
  const group = queryOne(form, ':scope > .form-group:first-child', HTMLElement);
  return (
    group &&
    queryOne(group, ':scope > a.text[data-icon], :scope > p > a.text[data-icon]', HTMLAnchorElement)
  );
}

/** Where the copy goes: the title row of the box the form stands in. */
function titleRow(form: HTMLFormElement): HTMLElement | null {
  const box = form.parentElement;
  if (!box?.classList.contains('box')) return null;
  return queryOne(box, ':scope > h1.box__top, :scope > .box__top', HTMLElement);
}

/** Copies the link into the title and marks its group, which narrow screens keep instead. */
export function moveHelpLink(form: HTMLFormElement): void {
  const link = helpLink(form);
  const title = titleRow(form);
  if (!link || !title || queryOne(title, `:scope > .${HELP_CLASS}`, HTMLAnchorElement)) return;
  const copy = createElement('a', {
    className: HELP_CLASS,
    text: link.textContent.trim(),
    attrs: { href: link.href, ...(link.target ? { target: link.target, rel: 'noopener' } : {}) },
  });
  title.append(copy);
  const group = link.closest('.form-group');
  if (group instanceof HTMLElement) setData(group, 'lnExtHelp', 'title');
}

export function syncFormHelp(): void {
  const form = queryOne(
    document,
    'main.box:not(.account, .simul-form) > form.form3, main:not(.account, .simul-form) .box > form.form3',
    HTMLFormElement,
  );
  if (!form || form === done) return;
  done = form;
  moveHelpLink(form);
}

export const formHelp: Feature = {
  name: 'form help link',
  start: () => onEveryTick('form help link', syncFormHelp),
};
