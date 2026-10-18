import { createElement, queryOne } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { cleanName, keepOwnName, MAX_NAME_LENGTH, onOwnName, ownName } from '#shared/own-name.ts';
import { message } from '#content/platform/runtime.ts';

// The Name card of the settings' Profile customization page
// (styles/pages/settings-profile.css): a name the user sees in place of their
// own, only in their browser (#shared/own-name.ts, content/ui/own-name.ts).

const userName = (): string => document.body.dataset.username ?? '';

const CARD = html`<div class="ln-ext-avatar-pick__head">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div>
      <h2 class="ln-ext-setting__title">${message('nameTitle')}</h2>
      <p class="ln-ext-setting__body">${message('nameBody')}</p>
    </div>
  </div>
  <form class="ln-ext-name-pick__form">
    <input type="text" name="name" maxlength="${MAX_NAME_LENGTH}" autocomplete="off" spellcheck="false" aria-label="${message('nameTitle')}" />
    <button type="submit" class="ln-ext-name-pick__save">${message('nameSave')}</button>
    <button type="button" class="ln-ext-name-pick__reset">${message('nameReset')}</button>
  </form>`;

function show(card: HTMLElement, name: string | null): void {
  const input = queryOne(card, 'input', HTMLInputElement);
  if (input) {
    input.placeholder = userName();
    // Not while it's typed in: what the user types stays until they save it.
    if (document.activeElement !== input) input.value = name ?? '';
  }
  const reset = queryOne(card, '.ln-ext-name-pick__reset', HTMLElement);
  if (reset) reset.hidden = name === null;
}

export function buildNameCard(): HTMLElement {
  const card = createElement('section', { className: 'ln-ext-avatar-pick ln-ext-name-pick' });
  setHtml(card, CARD);
  const input = queryOne(card, 'input', HTMLInputElement);
  queryOne(card, 'form', HTMLFormElement)?.addEventListener('submit', event => {
    event.preventDefault();
    const name = cleanName(input?.value ?? '');
    // Out of the field first, which shows the name as kept, trimmed or none.
    input?.blur();
    // Their own name, or none: no pick.
    keepOwnName(name === null || name === userName() ? null : name);
    show(card, ownName());
  });
  queryOne(card, '.ln-ext-name-pick__reset', HTMLElement)?.addEventListener('click', () => {
    keepOwnName(null);
  });
  onOwnName(name => show(card, name));
  show(card, ownName());
  return card;
}
