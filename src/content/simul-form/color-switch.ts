import { closestTo, createElement, queryAll, queryOne } from '#shared/dom.ts';

// The host's color as three buttons side by side, each a piece in the board's set (or a
// die for random), standing in for Lichess's select, which keeps the value the form posts.

const CLASS = 'ln-ext-simul-form__colors';

export function buildColorSwitch(form: HTMLFormElement): void {
  const select = queryOne(form, "select[name='color']", HTMLSelectElement);
  if (!select) return;
  const label = select.labels[0]?.textContent.trim() ?? '';
  const group = createElement('div', {
    className: CLASS,
    attrs: { role: 'radiogroup', 'aria-label': label },
  });
  for (const option of select.options) {
    group.append(
      createElement('button', {
        text: option.textContent.trim(),
        attrs: { type: 'button', role: 'radio', 'data-ln-ext-color': option.value },
      }),
    );
  }
  group.addEventListener('click', event => {
    const button = closestTo(event.target, 'button[data-ln-ext-color]', HTMLButtonElement);
    const value = button?.dataset['lnExtColor'];
    if (value === undefined || value === select.value) return;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  select.after(group);
}

export function syncColorSwitch(form: HTMLFormElement, value: string): void {
  for (const button of queryAll(form, `.${CLASS} button`, HTMLButtonElement)) {
    const checked = String(button.dataset['lnExtColor'] === value);
    if (button.getAttribute('aria-checked') !== checked)
      button.setAttribute('aria-checked', checked);
  }
}
