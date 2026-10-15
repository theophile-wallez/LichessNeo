import { createElement, queryOne, setData } from '#shared/dom.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { chosenCoach } from '#content/coach/chosen.ts';
import { showCoach } from '#content/coach/index.ts';
import { puzzleMood, readStep } from './mood.ts';

// The Game Review's coach on the puzzle's status card
// (styles/puzzle/coach-card.css). Lichess redraws the card whole between
// steps, so the coach is ours, at the end of the panel, laid over the card.

const REACT = 'lr-ext-coach__avatar--react';

function buildAvatar(): HTMLElement {
  const avatar = createElement('div', {
    className: 'lr-ext-coach__avatar lr-ext-puzzle-coach',
    attrs: { 'aria-hidden': 'true' },
  });
  avatar.append(createElement('span', { className: 'lr-ext-coach__face' }));
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
  if (!isNew && avatar.dataset.lrExtMood === mood) return;
  const coach = chosenCoach();
  setData(avatar, 'lrExtCoachId', String(coach));
  setData(avatar, 'lrExtMood', mood);
  if (!isNew) {
    avatar.classList.toggle(REACT, false);
    // Reading the layout restarts the marks' animation.
    void avatar.offsetWidth;
    avatar.classList.toggle(REACT, true);
  }
  showCoach({ coach, mood, talking: false });
}
