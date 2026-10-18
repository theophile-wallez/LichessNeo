import { createElement, queryOne } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { themeFromCode, type SharedTheme } from '#content/colors/share.ts';

// Adds a theme someone shared: its code (colors/share.ts), pasted in a field
// that opens under the themes' header.

export interface CodeForm {
  readonly element: HTMLElement;
  readonly toggle: () => void;
}

export function createCodeForm(onAdd: (theme: SharedTheme) => void): CodeForm {
  const element = createElement('form', { className: 'ln-ext-theme-code' });
  element.hidden = true;
  setHtml(
    element,
    html`<input
        type="text"
        class="ln-ext-theme-code__field"
        spellcheck="false"
        autocomplete="off"
        placeholder="${message('themeCodePlaceholder')}"
        aria-label="${message('themeCodePlaceholder')}"
      />
      <button type="submit" class="button">${message('themeCodeAdd')}</button>
      <p class="ln-ext-theme-code__error" hidden>${message('themeCodeInvalid')}</p>`,
  );
  const field = queryOne(element, '.ln-ext-theme-code__field', HTMLInputElement);
  const error = queryOne(element, '.ln-ext-theme-code__error', HTMLElement);
  const close = (): void => {
    element.hidden = true;
    if (field) field.value = '';
    if (error) error.hidden = true;
  };
  element.addEventListener('submit', event => {
    event.preventDefault();
    const theme = themeFromCode(field?.value ?? '');
    if (error) error.hidden = theme !== null;
    if (!theme) return;
    onAdd(theme);
    close();
  });
  const toggle = (): void => {
    if (!element.hidden) return close();
    element.hidden = false;
    field?.focus();
  };
  return { element, toggle };
}
