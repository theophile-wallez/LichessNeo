import { createElement } from '#shared/dom.ts';

// A heading over a group of a settings page's cards (styles/pages/extension-settings.css).

export const groupTitle = (name: string): HTMLElement =>
  createElement('h2', { className: 'ln-ext-settings__group', text: name });
