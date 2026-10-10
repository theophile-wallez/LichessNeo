import Copy01Icon from '@hugeicons/core-free-icons/Copy01Icon';
import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
import PencilEdit02Icon from '@hugeicons/core-free-icons/PencilEdit02Icon';
import Sun03Icon from '@hugeicons/core-free-icons/Sun03Icon';
import { html, type SafeHtml, trustedHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import { isCustom, SCHEMES, type ColorTheme, type Scheme } from '#content/colors/themes.ts';

// The markup of the Appearance card's previews: a page in small, and a theme's
// card with an orb for each scheme and a button to copy it (a built-in theme)
// or edit it (the user's own).

// A page of the extension in small: the sidebar, a board, the moves and a button.
const MOCK = trustedHtml(`<span class="lr-ext-mock__side"><i></i><i></i><i></i></span>
  <span class="lr-ext-mock__board"></span>
  <span class="lr-ext-mock__panel"><i></i><i></i><i></i><b></b></span>`);

/** The page in small, in `scheme`; `role` names it for the code that gives it a palette. */
export const mock = (scheme: Scheme, role: string): SafeHtml =>
  html`<span class="lr-ext-mock" data-lr-ext-palette="${scheme}" data-lr-ext-mock="${role}">${MOCK}</span>`;

export const BADGES: Readonly<Record<Scheme, SafeHtml>> = {
  light: hugeicon(Sun03Icon),
  dark: hugeicon(Moon02Icon),
};

export const themeName = (theme: ColorTheme): string =>
  isCustom(theme) ? theme.name : message(theme.message);

const orb = (scheme: Scheme, name: string): SafeHtml =>
  html`<button
    type="button"
    class="lr-ext-orb"
    data-lr-ext-palette="${scheme}"
    data-lr-ext-orb="${scheme}"
    aria-pressed="false"
    aria-label="${message(scheme === 'light' ? 'themeForLight' : 'themeForDark', name)}"
  >
    <span class="lr-ext-orb__badge">${BADGES[scheme]}</span>
  </button>`;

function actionMarkup(theme: ColorTheme, name: string): SafeHtml {
  const [action, icon, label] = isCustom(theme)
    ? ['edit', PencilEdit02Icon, message('themeEdit', name)]
    : ['copy', Copy01Icon, message('themeCopy', name)];
  return html`<button type="button" class="lr-ext-theme__action" data-lr-ext-theme-action="${action}" title="${label}" aria-label="${label}">${hugeicon(icon)}</button>`;
}

export function themeMarkup(theme: ColorTheme): SafeHtml {
  const name = themeName(theme);
  return html`<div class="lr-ext-theme" data-lr-ext-theme="${theme.id}">
    <div class="lr-ext-theme__orbs">${SCHEMES.map(scheme => orb(scheme, name))}</div>
    <div class="lr-ext-theme__foot">
      <span class="lr-ext-theme__name">${name}</span>
      ${actionMarkup(theme, name)}
    </div>
  </div>`;
}
