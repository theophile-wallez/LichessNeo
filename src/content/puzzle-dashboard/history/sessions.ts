import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { pageLocale } from '#shared/lang.ts';
import { setHtml } from '#shared/html.ts';
import { tierOf } from './coach-word.ts';
import { dayHeading } from './day.ts';
import { readSession, SESSION } from './read.ts';
import { scoreMarkup } from './view.ts';

// Each session of the history as a card (styles/puzzles/history.css): its
// score beside its title, and a heading over each day's first one. Lichess
// adds sessions as the page scrolls; those get theirs on the next tick.

const NEW_SESSION = `${SESSION}:not([data-lr-ext-day])`;

// The session before, past our headings; null for the first.
function previousSession(session: HTMLElement): HTMLElement | null {
  let sibling = session.previousElementSibling;
  while (sibling && !sibling.matches(SESSION)) sibling = sibling.previousElementSibling;
  return sibling instanceof HTMLElement ? sibling : null;
}

function decorate(session: HTMLElement, now: Date): void {
  const { at, rounds } = readSession(session);
  const title = queryOne(session, '.puzzle-history__session__title', HTMLElement);
  if (title && rounds.length > 0) {
    const score = createElement('span');
    const solved = rounds.filter(round => round.solved).length;
    setHtml(score, scoreMarkup(rounds, tierOf(solved / rounds.length)));
    if (score.firstElementChild) title.append(score.firstElementChild);
  }
  const day = at ? dayHeading(at, now, pageLocale()) : '';
  if (day && previousSession(session)?.dataset.lrExtDay !== day)
    session.before(createElement('h3', { className: 'lr-ext-phist__day', text: day }));
  setData(session, 'lrExtDay', day);
}

/** Gives the sessions not seen yet their score and heading. */
export function decorateSessions(root: ParentNode, now: Date): void {
  for (const session of queryAll(root, NEW_SESSION, HTMLElement)) decorate(session, now);
}
