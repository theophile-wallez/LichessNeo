import { z } from 'zod/mini';
import { userInHref } from '#shared/avatar.ts';
import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { parseJson } from '#shared/json.ts';
import { pageLocale } from '#shared/lang.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// A finished tournament's podium (styles/podium.css) shows each player's score
// over their step. An Arena's podium has no score, a Swiss's has it in a table
// the podium hides: both pages carry it in their init data. Lichess's word for
// it comes from src/page/labels.

const PLACES = 'main:is(.tour, .swiss) .podium > div';

// An Arena names its players and scores them; a Swiss nests the name and gives points.
const ArenaPlaceSchema = z.object({ name: z.string(), score: z.number() });
const SwissPlaceSchema = z.object({ user: z.object({ name: z.string() }), points: z.number() });

const PodiumInitSchema = z.object({
  data: z.object({ podium: z.array(z.union([ArenaPlaceSchema, SwissPlaceSchema])) }),
});

/** Each podium player's score, by their lower-cased name, from the page's init data. */
export function podiumScores(text: string | null): ReadonlyMap<string, number> {
  const init = parseJson(text, PodiumInitSchema);
  const scores = new Map<string, number>();
  for (const place of init?.data.podium ?? []) {
    if ('score' in place) scores.set(place.name.toLowerCase(), place.score);
    else scores.set(place.user.name.toLowerCase(), place.points);
  }
  return scores;
}

function scoreOf(place: HTMLElement, scores: ReadonlyMap<string, number>): number | undefined {
  const link = queryOne(place, ':scope > a.user-link', HTMLAnchorElement);
  const user = userInHref(link?.getAttribute('href'));
  return user === undefined ? undefined : scores.get(user.toLowerCase());
}

function drawScore(place: HTMLElement, score: number, label: string): void {
  const text = new Intl.NumberFormat(pageLocale()).format(score);
  const shown = `${text} ${label}`.trim();
  let element = queryOne(place, ':scope > .lr-ext-podium__score', HTMLElement);
  if (element?.dataset.lrExtShown === shown) return;
  if (!element) {
    element = createElement('span', { className: 'lr-ext-podium__score' });
    place.append(element);
  }
  element.replaceChildren(createElement('b', { text }), label ? ` ${label}` : '');
  setData(element, 'lrExtShown', shown);
}

/** Puts each player's score in their place on the podium. */
export function syncPodium(scores: ReadonlyMap<string, number>): void {
  const label = document.documentElement.dataset.lrExtPointsLabel ?? '';
  for (const place of queryAll(document, PLACES, HTMLElement)) {
    const score = scoreOf(place, scores);
    if (score === undefined)
      queryOne(place, ':scope > .lr-ext-podium__score', HTMLElement)?.remove();
    else drawScore(place, score, label);
  }
}

export const podium: Feature = {
  name: 'podium',
  start: () =>
    readPageInitData(text => {
      const scores = podiumScores(text);
      if (scores.size > 0) onEveryTick('podium', () => syncPodium(scores));
    }),
};
