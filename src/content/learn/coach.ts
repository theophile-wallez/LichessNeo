import { setData, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { ownCoachCard } from '#content/coach/card.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { readSaying } from './saying.ts';

// A Learn stage's coach (styles/learn/coach.css): on the panel right of the
// board, between the stage's title and its levels, it says the level's goal
// in the Game Review's coach card, then cheers or comforts as the level ends.
// Lichess redraws the panel, so the coach is ours, at its end, laid out in
// its place by the stylesheet.

const ownCard = ownCoachCard('ln-ext-learn-coach');

function sync(): void {
  const table = queryOne(document, '.learn--run .learn__table', HTMLElement);
  const saying = table && readSaying(table);
  if (!table || !saying) return;
  ownCard(table).say(saying);
  setData(table, 'lnExtLearnCoach', '');
}

export const learnCoach: Feature = {
  name: 'learn coach',
  start: () => onEveryTick('learn coach', sync),
};
