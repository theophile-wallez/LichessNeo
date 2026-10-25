import Search01Icon from '@hugeicons/core-free-icons/Search01Icon';
import { createElement, onDomReady, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { html, setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { togglePalette } from './palette.ts';

// The sidebar's search box opens the command palette (palette.ts) in place of Lichess's
// box, which stays in the page but out of sight (styles/sidebar/search.css): Lichess's
// shortcuts to it (s, /) focus it, and its focus opens the palette instead. ⌘K, or
// Ctrl+K, opens it from anywhere.

const TRIGGER_ID = 'ln-ext-search';
const isMac = (): boolean => /Mac|iPhone|iPad/.test(navigator.userAgent);

function syncTrigger(): void {
  if (document.getElementById(TRIGGER_ID)) return;
  const buttons = queryOne(document, '#top .site-buttons', HTMLElement);
  if (!buttons) return;
  const label = message('paletteSearch');
  const trigger = createElement('button', {
    id: TRIGGER_ID,
    className: 'link',
    attrs: { type: 'button', 'aria-haspopup': 'dialog', 'aria-label': label },
  });
  setHtml(
    trigger,
    html`${hugeicon(Search01Icon)}<span class="ln-ext-search__label">${label}</span><kbd
        class="ln-ext-search__keys"
        >${isMac() ? '⌘K' : 'Ctrl K'}</kbd
      >`,
  );
  trigger.addEventListener('click', togglePalette);
  buttons.append(trigger);
  const lichessBox = queryOne(buttons, '#clinput input', HTMLInputElement);
  lichessBox?.addEventListener('focus', () => {
    // Blurred first, so the palette gives the focus back to the page, not to it.
    lichessBox.value = '';
    lichessBox.blur();
    togglePalette();
  });
}

function onShortcut(event: KeyboardEvent): void {
  if (event.key.toLowerCase() !== 'k' || event.altKey || event.shiftKey) return;
  if (!(isMac() ? event.metaKey : event.ctrlKey)) return;
  event.preventDefault();
  togglePalette();
}

export const commandPalette: Feature = {
  name: 'command palette',
  start: () => {
    window.addEventListener('keydown', onShortcut, { capture: true });
    onDomReady(syncTrigger);
    onEveryTick('command palette', syncTrigger);
  },
};
