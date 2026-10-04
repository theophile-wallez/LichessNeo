import { closestTo, queryAll, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { syncAvatars } from './avatars.ts';
import { fitCard } from './card-fit.ts';
import { ratingState, ratingText } from './card-ratings.ts';

// The profile hover card (styles/powertip/). Lichess rebuilds its HTML on
// every hover, so an observer catches each new one before it's painted:
// polling would show Lichess's markup first.

// Lichess right-aligns the ratings in fixed-width columns by padding the short
// ones with no-break spaces. Our chips center their value, so we drop the padding.
export function cleanRatings(card: HTMLElement): void {
  for (const rating of queryAll(card, '.upt__info__ratings > span', HTMLElement)) {
    const text = ratingText(rating.textContent);
    if (rating.textContent !== text) rating.textContent = text;
    setData(rating, 'cdcRating', ratingState(text));
  }
}

/** The name the pointer is on, which the card belongs to. */
let anchor: Element | null = null;

function trackAnchor(event: MouseEvent): void {
  const target = closestTo(event.target, 'a, [data-href]', Element);
  if (target && !target.closest('#powerTip')) anchor = target;
}

export function fitPowertip(card: HTMLElement): void {
  if (getComputedStyle(card).visibility !== 'visible') return;
  const box = card.getBoundingClientRect();
  const name = anchor?.isConnected ? anchor.getBoundingClientRect() : null;
  const target = fitCard(box, name, { width: innerWidth, height: innerHeight });
  if (!target) return;
  const top = (parseFloat(card.style.top) || 0) + target.top - box.top;
  const left = (parseFloat(card.style.left) || 0) + target.left - box.left;
  // Only what changes: the observer below calls this again on any write.
  setStyleProperty(card, 'top', `${top}px`);
  setStyleProperty(card, 'left', `${left}px`);
}

function watch(card: HTMLElement): void {
  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList')) {
      cleanRatings(card);
      syncAvatars(card);
    }
    fitPowertip(card);
  }).observe(card, { childList: true, attributes: true, attributeFilter: ['style'] });
  new ResizeObserver(() => fitPowertip(card)).observe(card);
  cleanRatings(card);
  syncAvatars(card);
}

// Lichess only adds the card on the first hover (or when idle, on the pages
// that preload them).
export function createPowertipSync(): () => void {
  let watched: HTMLElement | null = null;
  return () => {
    const card = document.getElementById('powerTip');
    if (!card || card === watched) return;
    watched = card;
    watch(card);
  };
}

export const powertip: Feature = {
  name: 'hover card',
  start: () => {
    document.addEventListener('mouseover', trackAnchor, true);
    onEveryTick('hover card', createPowertipSync());
  },
};
