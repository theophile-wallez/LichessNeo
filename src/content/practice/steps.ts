import { centerInScroller, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// A practice lesson's exercises scroll in their card on a desktop
// (styles/practice-run/lesson-card.css): the one on show is brought into view
// as it changes, the list left where the user scrolled it otherwise.

let shown: HTMLElement | null = null;

function sync(): void {
  const active = queryOne(
    document,
    'main.analyse .practice__side__chapters .ps__chapter.active',
    HTMLElement,
  );
  if (active === shown) return;
  shown = active;
  // Below 1020px the list doesn't scroll: the page would, down to it.
  const list = active?.parentElement;
  if (active && list && list.scrollHeight > list.clientHeight) centerInScroller(active);
}

export const practiceSteps: Feature = {
  name: 'practice steps',
  start: () => onEveryTick('practice steps', sync),
};
