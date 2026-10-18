import { createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { syncWhileParsing } from '#shared/frame.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// The video library's intro says, in three lines, that its videos are free
// and how many there are: a pill beside the title says both instead
// (styles/pages/videos.css). The count is the intro's only number, whatever
// its language; without one, the intro stays.

const PILL = 'ln-ext-video-count';

/** The one number in Lichess's intro, its digits run together ("1,547" is 1547). */
export function videoCount(intro: string): number | null {
  const numbers = intro.match(/\d[\d\s.,’']*\d|\d/g);
  if (numbers?.length !== 1) return null;
  const count = Number(numbers[0].replace(/\D/g, ''));
  return Number.isSafeInteger(count) ? count : null;
}

export function syncVideoCount(): void {
  const title = queryOne(
    document,
    'main.video > .page-menu__content > .box__top > h1',
    HTMLElement,
  );
  const intro = queryOne(document, 'main.video > .page-menu__content > p.explain', HTMLElement);
  if (!title || !intro || queryOne(title.parentElement ?? title, `.${PILL}`, HTMLElement)) return;
  const count = videoCount(intro.textContent);
  if (count === null) return;
  const text = message(
    'videosCount',
    new Intl.NumberFormat(document.documentElement.lang || undefined).format(count),
  );
  title.after(createElement('span', { className: PILL, text }));
  setData(intro, 'lnExtCounted', '');
}

export const videoCountPill: Feature = {
  name: 'video count',
  start: () => {
    syncWhileParsing(syncVideoCount);
    onEveryTick('video count', syncVideoCount);
  },
};
