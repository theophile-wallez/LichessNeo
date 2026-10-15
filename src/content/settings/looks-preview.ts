import PlayIcon from '@hugeicons/core-free-icons/PlayIcon';
import { createElement, queryOne } from '#shared/dom.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { html, setHtml } from '#shared/html.ts';
import { onPageReady, postLooksPreview } from '#shared/protocol.ts';
import { message } from '#content/platform/runtime.ts';

// The Board & sounds page's preview (styles/pages/settings-looks.css): a board
// in the looks picked, which plays a short game to hear them. The page world
// draws and plays it (page/looks/preview.ts), as Lichess's sounds and the
// backlit light live there.

const CARD = html`<div class="lr-ext-looks__head">
    <span class="lr-ext-setting__icon" aria-hidden="true"></span>
    <div>
      <h2 class="lr-ext-setting__title">${message('looksPreview')}</h2>
      <p class="lr-ext-setting__body">${message('looksPreviewBody')}</p>
    </div>
  </div>
  <div class="lr-ext-looks-preview__board is2d" aria-hidden="true"></div>
  <button type="button" class="lr-ext-looks-preview__play">
    ${hugeicon(PlayIcon)}<span>${message('looksPreviewPlay')}</span>
  </button>`;

export interface LooksPreview {
  readonly element: HTMLElement;
  /** Draws the board as its page shows. */
  readonly show: () => void;
  /** Plays a move, to hear a sound set just picked. */
  readonly step: () => void;
}

export function buildLooksPreview(): LooksPreview {
  const card = createElement('section', { className: 'lr-ext-looks-preview' });
  setHtml(card, CARD);
  queryOne(card, '.lr-ext-looks-preview__play', HTMLElement)?.addEventListener('click', () => {
    postLooksPreview('play');
  });
  // The page script may start after the page shows: it says so, and draws the board then.
  onPageReady(() => {
    if (card.isConnected) postLooksPreview('draw');
  });
  return {
    element: card,
    show: () => postLooksPreview('draw'),
    step: () => postLooksPreview('step'),
  };
}
