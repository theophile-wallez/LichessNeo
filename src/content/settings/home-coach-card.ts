import MentoringIcon from '@hugeicons/core-free-icons/MentoringIcon';
import { chooseHomeCoach, type CoachPick, coachPick, homeCoachChoice } from '#shared/coach.ts';
import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';
import { onCoachChosen } from '#content/bootstrap/coach-choice.ts';
import { coachChoices, pickIcon, tilePick } from '#content/coach/names.ts';

// The settings' Home coach card, under the coach's on the Profile & coach page
// (styles/pages/settings-coach.css): which coach stands in the home's hero
// (content/pages/hero-coach.ts). It follows the coach every other page shows,
// wearing its face, until the card is told to give the home one of its own:
// then, and only then, the coaches' tiles come out, no coach and one at random
// first.

const FOLLOW = 'follow';
const OWN = 'own';
const MODE = '[data-ln-ext-home-coach]';
const TILE = '.ln-ext-coach-choice';
const GRID = '.ln-ext-home-coach__grid';

const CARD = html`<div class="ln-ext-coach-pick__head">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div>
      <h2 class="ln-ext-setting__title">${message('homeCoachTitle')}</h2>
      <p class="ln-ext-setting__body">${message('homeCoachBody')}</p>
    </div>
  </div>
  <div class="ln-ext-home-coach__modes">
    <button type="button" class="ln-ext-home-coach__mode" data-ln-ext-home-coach="${FOLLOW}" aria-pressed="false">
      <span class="ln-ext-home-coach__face" aria-hidden="true"></span>
      <span>${message('homeCoachFollow')}</span>
    </button>
    <button type="button" class="ln-ext-home-coach__mode" data-ln-ext-home-coach="${OWN}" aria-pressed="false">
      <span class="ln-ext-home-coach__glyph" aria-hidden="true">${hugeicon(MentoringIcon)}</span>
      <span>${message('homeCoachOwn')}</span>
    </button>
  </div>
  <div class="ln-ext-coach-pick__grid ln-ext-home-coach__grid" hidden></div>`;

export interface HomeCoachCard {
  readonly element: HTMLElement;
  /** Reads the picks again as its page shows: either may have changed since. */
  readonly show: (visible: boolean) => void;
}

function setPressed(button: HTMLElement, pressed: boolean): void {
  if (button.getAttribute('aria-pressed') !== String(pressed))
    button.setAttribute('aria-pressed', String(pressed));
}

// The tiles are drawn the first time the home takes a coach of its own: the card sits on every
// account page, and most never need them.
function fillGrid(grid: HTMLElement): void {
  if (!grid.firstElementChild) setHtml(grid, html`${coachChoices()}`);
}

/** The mode pressed, the tiles out only for a coach of the home's own, and that coach's tile. */
function showChoice(card: HTMLElement, choice: CoachPick | null): void {
  for (const button of queryAll(card, MODE, HTMLElement))
    setPressed(button, (button.dataset.lnExtHomeCoach === OWN) === (choice !== null));
  const grid = queryOne(card, GRID, HTMLElement);
  if (grid) {
    if (choice !== null) fillGrid(grid);
    if (grid.hidden !== (choice === null)) grid.hidden = choice === null;
  }
  for (const tile of queryAll(card, TILE, HTMLElement))
    setPressed(tile, tile.dataset.lnExtCoachChoice === String(choice));
}

/**
 * The following mode wears the pick it follows, as the card above or the review picks it:
 * a coach's face, or the glyph of no coach or of one at random.
 */
function showFollowed(card: HTMLElement, pick: CoachPick): void {
  const face = queryOne(card, '.ln-ext-home-coach__face', HTMLElement);
  if (!face) return;
  setData(face, 'lnExtAvatarCoach', typeof pick === 'number' ? String(pick) : null);
  setHtml(face, typeof pick === 'number' ? html`` : pickIcon(pick));
}

/**
 * What a click asks of the card: null to follow the coach, a coach of the home's own, or
 * undefined for anything else. Turning to its own starts on the one it followed.
 */
function asked(target: EventTarget | null, choice: CoachPick | null): CoachPick | null | undefined {
  const mode = closestTo(target, MODE, HTMLElement)?.dataset.lnExtHomeCoach;
  if (mode === FOLLOW) return null;
  if (mode === OWN) return choice ?? coachPick();
  return tilePick(target) ?? undefined;
}

/** The card, kept in step with the coach picked for the other pages. */
export function buildHomeCoachCard(): HomeCoachCard {
  const card = createElement('section', { className: 'ln-ext-coach-pick ln-ext-home-coach' });
  setHtml(card, CARD);
  let choice = homeCoachChoice();
  let visible = false;
  card.addEventListener('click', event => {
    const next = asked(event.target, choice);
    if (next === undefined || next === choice) return;
    choice = next;
    chooseHomeCoach(next);
    showChoice(card, next);
  });
  onCoachChosen(coach => showFollowed(card, coach));
  showFollowed(card, coachPick());
  showChoice(card, choice);
  return {
    element: card,
    show: next => {
      if (next === visible) return;
      visible = next;
      if (!visible) return;
      choice = homeCoachChoice();
      showFollowed(card, coachPick());
      showChoice(card, choice);
    },
  };
}
