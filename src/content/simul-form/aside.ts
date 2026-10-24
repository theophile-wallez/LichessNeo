import { createElement, queryOne } from '#shared/dom.ts';
import { message } from '#content/platform/runtime.ts';

// The column beside the form: the simul's card as the list will show it, a summary of
// what matters most, and the form's own button, which stays in sight as the form scrolls.

const CLASS = 'ln-ext-simul-form';

/** The summary's rows, each a label and the element its value goes in. */
export const ROWS = ['color', 'clock', 'entry', 'start'] as const;
export type SummaryRow = (typeof ROWS)[number];

// The entry conditions' row keeps Lichess's name for them.
const ROW_LABELS: Readonly<Record<SummaryRow, (form: HTMLFormElement) => string>> = {
  color: () => message('simulFormYouPlay'),
  clock: () => message('simulFormYourClock'),
  entry: form => form.querySelector("[data-ln-ext-part='entry'] legend")?.textContent.trim() ?? '',
  start: () => message('simulFormStarts'),
};

function buildCard(): HTMLElement {
  const card = createElement('div', { className: `${CLASS}__card` });
  const head = createElement('div', { className: `${CLASS}__card-head` });
  head.append(
    createElement('h3', { className: `${CLASS}__card-name` }),
    createElement('span', { className: `${CLASS}__card-meta` }),
  );
  const host = createElement('div', { className: `${CLASS}__card-host` });
  const user = document.getElementById('user_tag')?.textContent.trim() ?? '';
  host.append(
    createElement('span', { text: user }),
    createElement('span', { className: `${CLASS}__card-players`, text: '0' }),
  );
  card.append(createElement('span', { className: `${CLASS}__card-tile` }), head, host);
  return card;
}

function buildSummary(form: HTMLFormElement): HTMLElement {
  const list = createElement('dl', { className: `${CLASS}__summary` });
  for (const row of ROWS) {
    const line = createElement('div', { attrs: { 'data-ln-ext-row': row } });
    line.append(createElement('dt', { text: ROW_LABELS[row](form) }), createElement('dd'));
    list.append(line);
  }
  return list;
}

// Our button submits through Lichess's, which the desktop layout hides: its checks and
// its posting stay Lichess's.
function buildActions(form: HTMLFormElement): HTMLElement[] {
  const submit = queryOne(form, "button[type='submit']", HTMLButtonElement);
  const cancel = queryOne(form, '.form-actions a', HTMLAnchorElement);
  const actions: HTMLElement[] = [];
  if (submit) {
    const button = createElement('button', {
      className: `${CLASS}__submit button`,
      text: submit.textContent.trim(),
      attrs: { type: 'button', 'data-icon': submit.dataset['icon'] ?? '' },
    });
    button.addEventListener('click', () => submit.click());
    actions.push(button);
  }
  if (cancel) {
    actions.push(
      createElement('a', {
        className: `${CLASS}__cancel`,
        text: cancel.textContent.trim(),
        attrs: { href: cancel.href },
      }),
    );
  }
  return actions;
}

export function buildAside(form: HTMLFormElement): HTMLElement {
  const aside = createElement('aside', { className: `${CLASS}__aside` });
  aside.append(
    createElement('p', { className: `${CLASS}__preview`, text: message('simulFormPreview') }),
    buildCard(),
    buildSummary(form),
    ...buildActions(form),
  );
  return aside;
}
