import Moon02Icon from '@hugeicons/core-free-icons/Moon02Icon';
import Sun03Icon from '@hugeicons/core-free-icons/Sun03Icon';
import { createElement, onDomReady, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { html, setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { postColorScheme } from '#shared/protocol.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// A light / dark switch beside the sidebar's bottom buttons, its icon the
// scheme on show (styles/sidebar/donate-and-buttons.css). It sets Lichess's
// own Theme preference, as the settings' Appearance card does, so a device
// scheme ("system") becomes the other one for good.

const TOGGLE_ID = 'ln-ext-scheme-toggle';

const isLight = (): boolean => document.documentElement.classList.contains('light');

function toggleScheme(): void {
  postColorScheme(isLight() ? 'dark' : 'light');
}

// Lichess's own menu may change the scheme too: the label follows on the next tick.
function showLabel(button: HTMLElement): void {
  const label = message(isLight() ? 'schemeToggleToDark' : 'schemeToggleToLight');
  if (button.title === label) return;
  button.title = label;
  button.setAttribute('aria-label', label);
}

function syncToggle(): void {
  let button = document.getElementById(TOGGLE_ID);
  if (!button) {
    const buttons = queryOne(document, '#top .site-buttons', HTMLElement);
    if (!buttons) return;
    button = createElement('button', {
      id: TOGGLE_ID,
      className: 'link',
      attrs: { type: 'button' },
    });
    setHtml(
      button,
      html`${hugeicon(Sun03Icon, { className: 'ln-ext-scheme-toggle__light' })}${hugeicon(
        Moon02Icon,
        { className: 'ln-ext-scheme-toggle__dark' },
      )}`,
    );
    button.addEventListener('click', toggleScheme);
    buttons.append(button);
  }
  showLabel(button);
}

export const schemeToggle: Feature = {
  name: 'scheme toggle',
  start: () => {
    onDomReady(syncToggle);
    onEveryTick('scheme toggle', syncToggle);
  },
};
