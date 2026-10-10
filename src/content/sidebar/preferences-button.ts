import Settings01Icon from '@hugeicons/core-free-icons/Settings01Icon';
import { createElement, onDomReady, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// A cog among the sidebar's bottom buttons, in the challenges' place
// (styles/sidebar/donate-and-buttons.css): a link to Lichess's preferences,
// which only a signed-in user has.

const BUTTON_ID = 'lr-ext-preferences-button';
const PREFERENCES_URL = '/account/preferences/display';

function syncButton(): void {
  if (document.getElementById(BUTTON_ID)) return;
  const buttons = queryOne(document, '#top .site-buttons', HTMLElement);
  if (!buttons?.querySelector('#user_tag')) return;
  const label = message('preferencesButton');
  const link = createElement('a', {
    id: BUTTON_ID,
    className: 'link',
    attrs: { href: PREFERENCES_URL, title: label, 'aria-label': label },
  });
  setHtml(link, hugeicon(Settings01Icon));
  buttons.append(link);
}

export const preferencesButton: Feature = {
  name: 'preferences button',
  start: () => {
    onDomReady(syncButton);
    onEveryTick('preferences button', syncButton);
  },
};
