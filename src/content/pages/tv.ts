import { queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Lichess TV (styles/tv.css).

const TV_PATH = /\/tv(\/|$)/;

function comesFromTv(referrer: string): boolean {
  try {
    const url = new URL(referrer);
    return url.origin === location.origin && TV_PATH.test(url.pathname);
  } catch {
    return false;
  }
}

function isReload(): boolean {
  const entry = performance.getEntriesByType('navigation')[0];
  return entry !== undefined && 'type' in entry && entry.type === 'reload';
}

// The channels slide in when TV is opened, not each time it loads again:
// from a channel link (the referrer is TV) or for the next game (Lichess
// reloads the page).
export function markStillIntro(): void {
  if (!TV_PATH.test(location.pathname)) return;
  if (comesFromTv(document.referrer) || isReload())
    document.documentElement.classList.toggle('lr-ext-tv-still', true);
}

/** A channel's tooltip, shown where only its tile is (below 1260px). */
export function channelTip(name: string | undefined, champion: string | undefined): string | null {
  if (!name) return null;
  return champion ? `${name} · ${champion}` : name;
}

// The channels' column scrolls on its own, and the channel on air is scrolled
// into view once the column has a height. The column is server-rendered and
// TV reloads for its next game, so doing it once is enough.
export function syncChannels(): void {
  const list = queryOne(
    document,
    'main.tv-single .subnav__inner:not([data-lr-ext-tv])',
    HTMLElement,
  );
  if (!list || list.clientHeight === 0) return;
  setData(list, 'lrExtTv', '');
  for (const channel of queryAll(list, 'a.tv-channel', HTMLElement)) {
    const name = channel.querySelector('strong')?.textContent.trim();
    const champion = channel.querySelector('.champion')?.textContent.replace(/\s+/g, ' ').trim();
    const tip = channelTip(name, champion);
    if (tip !== null) setData(channel, 'lrExtTip', tip);
  }
  const active = queryOne(list, 'a.tv-channel.active', HTMLElement);
  if (active) list.scrollTop = active.offsetTop - (list.clientHeight - active.offsetHeight) / 2;
}

export const tv: Feature = {
  name: 'tv',
  start: () => {
    markStillIntro();
    onEveryTick('tv channels', syncChannels);
  },
};
