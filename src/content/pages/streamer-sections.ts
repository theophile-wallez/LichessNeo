import { createElement, queryAll, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The streamers' page lists who's live, then everyone else, as one run of
// cards. Each list gets a title of ours before it (styles/pages/streamer-list.css):
// "Live now", with how many, and "Offline", whose list grows as it scrolls.

const SECTION = 'ln-ext-streamers__section';

function sectionTitle(text: string, count: number | null): HTMLElement {
  const title = createElement('h2', { className: SECTION, text });
  if (count !== null)
    title.append(createElement('span', { className: `${SECTION}-count`, text: String(count) }));
  return title;
}

function syncStreamerSections(): void {
  const lists = queryAll(document, '.streamer-list > .list', HTMLElement);
  for (const list of lists) {
    if (list.previousElementSibling?.classList.contains(SECTION)) continue;
    const live = list.classList.contains('live');
    const count = live ? queryAll(list, ':scope > .streamer', HTMLElement).length : null;
    // An empty offline list (Lichess's `.none` alone) needs no title.
    if (!live && !queryOne(list, ':scope > .streamer', HTMLElement)) continue;
    list.before(sectionTitle(message(live ? 'streamersLive' : 'streamersOffline'), count));
  }
}

export const streamerSections: Feature = {
  name: 'streamer sections',
  start: () => onEveryTick('streamer sections', syncStreamerSections),
};
