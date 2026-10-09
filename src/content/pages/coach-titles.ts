import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// Coach cards (styles/coach/cards.css): Lichess writes the title as plain text
// in the name ("FM Hans Renette"), and the card shows it as a badge. The
// picture's alt starts with the title, which catches names without one. The
// cards are server-rendered (and appended by infinite scroll), not snabbdom, so
// editing the name's text is safe.

const TITLES: ReadonlySet<string> = new Set([
  'GM',
  'IM',
  'FM',
  'CM',
  'NM',
  'WGM',
  'WIM',
  'WFM',
  'WCM',
  'WNM',
  'LM',
  'BOT',
]);

/** The title a coach's picture alt starts with, or ''. */
export function coachTitle(alt: string | undefined): string {
  const title = alt?.split(' ')[0];
  return title !== undefined && TITLES.has(title) ? title : '';
}

function badgeTitle(name: HTMLElement): void {
  const card = closestTo(name, '.coach-widget', Element);
  const title = coachTitle(card ? queryOne(card, 'img.picture', HTMLImageElement)?.alt : undefined);
  // Also marks the name as done.
  setData(name, 'lrExtTitle', title);
  if (title === '') return;
  const text = name.firstChild;
  if (text instanceof Text && text.data.startsWith(`${title} `))
    text.data = text.data.slice(title.length + 1);
  name.prepend(createElement('span', { className: 'lr-ext-coach-title', text: title }));
}

export function syncCoachTitles(): void {
  const names = '.coach-widget .coach-name:not([data-lr-ext-title])';
  for (const name of queryAll(document, names, HTMLElement)) badgeTitle(name);
}

export const coachTitles: Feature = {
  name: 'coach titles',
  start: () => onEveryTick('coach titles', syncCoachTitles),
};
