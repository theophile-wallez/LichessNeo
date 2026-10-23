import { shownCoach } from '#shared/coach.ts';
import { createElement, queryOne, setData } from '#shared/dom.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { showCoach } from '#content/coach/index.ts';
import { puzzleMood, readStep } from './mood.ts';

// The Game Review's coach on the puzzle's status card
// (styles/puzzle/coach-card.css). Lichess redraws the card whole between
// steps, so the coach is ours, at the end of the panel, laid over the card.

const REACT = 'ln-ext-coach__avatar--react';

function buildAvatar(): HTMLElement {
  const avatar = createElement('div', {
    className: 'ln-ext-coach__avatar ln-ext-puzzle-coach',
    attrs: { 'aria-hidden': 'true' },
  });
  avatar.append(createElement('span', { className: 'ln-ext-coach__face' }));
  return avatar;
}

const ownAvatar = createOwnedElement(buildAvatar);

export function syncPuzzleCoach(): void {
  const tools = queryOne(document, 'main.puzzle .puzzle__tools', HTMLElement);
  const feedback = tools && queryOne(tools, '.puzzle__feedback', HTMLElement);
  const step = feedback && readStep(feedback);
  if (!tools || !step) return;
  const { element: avatar, isNew } = ownAvatar(tools);
  // The session's chip for this puzzle turns green only when it's solved first time.
  const solved =
    queryOne(
      tools.parentElement ?? document,
      '.puzzle__session .current.result-true',
      HTMLElement,
    ) !== null;
  const mood = puzzleMood(step, solved);
  if (!isNew && avatar.dataset.lnExtMood === mood) return;
  const coach = shownCoach();
  setData(avatar, 'lnExtCoachId', coach === null ? null : String(coach));
  setData(avatar, 'lnExtMood', mood);
  if (!isNew) {
    avatar.classList.toggle(REACT, false);
    // Reading the layout restarts the marks' animation.
    void avatar.offsetWidth;
    avatar.classList.toggle(REACT, true);
  }
  if (coach !== null) showCoach({ coach, mood, talking: false });
}
