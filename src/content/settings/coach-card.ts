import { type COACH_COUNT, CoachIdSchema, pickCoach } from '#shared/coach.ts';
import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, type SafeHtml, setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { chooseCoach } from '#content/bootstrap/coach-choice.ts';
import { MascotSpot } from '#content/coach/spot.ts';

// The settings' Coach card, on the Personalization page, under Appearance
// (styles/pages/settings-coach.css): the coach, live over its still, says
// hello, over a tile for each coach. The pick is the one every coach shows
// (#shared/coach.ts): the review, the puzzles, the drills.

// The coaches' names, in the order of their numbers (content/coach/mascot/cast).
const NAMES = [
  'coachPawn',
  'coachFennec',
  'coachDino',
  'coachAxolotl',
  'coachFrog',
  'coachBee',
  'coachOctopus',
  'coachRobot',
] as const satisfies { length: typeof COACH_COUNT };

/** The name of the coach of number `coach`. */
export const coachName = (coach: number): string => message(NAMES[coach - 1] ?? NAMES[0]);

const choiceMarkup = (name: string, i: number): SafeHtml =>
  html`<button type="button" class="lr-ext-coach-choice" data-lr-ext-coach-choice="${i + 1}" aria-pressed="false">
    <span class="lr-ext-coach-choice__face" data-lr-ext-avatar-coach="${i + 1}"></span>
    <span class="lr-ext-coach-choice__name">${message(name)}</span>
  </button>`;

const CARD = html`<div class="lr-ext-coach-pick__head">
    <span class="lr-ext-setting__icon" aria-hidden="true"></span>
    <div>
      <h2 class="lr-ext-setting__title">${message('coachPickTitle')}</h2>
      <p class="lr-ext-setting__body">${message('coachPickBody')}</p>
    </div>
  </div>
  <div class="lr-ext-coach-pick__stage">
    <span class="lr-ext-coach-pick__mascot" aria-hidden="true"></span>
    <p class="lr-ext-coach-pick__bubble" aria-live="polite"></p>
  </div>
  <div class="lr-ext-coach-pick__grid">${NAMES.map(choiceMarkup)}</div>`;

export interface CoachCard {
  readonly element: HTMLElement;
  /** Brings the coach in as its page shows, and takes it away as it hides. */
  readonly show: (visible: boolean) => void;
}

function showPick(card: HTMLElement, coach: number): void {
  const mascot = queryOne(card, '.lr-ext-coach-pick__mascot', HTMLElement);
  if (mascot) setData(mascot, 'lrExtAvatarCoach', String(coach));
  for (const choice of queryAll(card, '.lr-ext-coach-choice', HTMLElement)) {
    const pressed = String(choice.dataset.lrExtCoachChoice === String(coach));
    if (choice.getAttribute('aria-pressed') !== pressed)
      choice.setAttribute('aria-pressed', pressed);
  }
  // A new bubble each time, so it pops in again.
  const bubble = queryOne(card, '.lr-ext-coach-pick__bubble', HTMLElement);
  bubble?.replaceChildren(
    createElement('span', { text: message('coachPickHello', coachName(coach)) }),
  );
}

/** The card, its coach live only while its page shows. */
export function buildCoachCard(): CoachCard {
  const card = createElement('section', { className: 'lr-ext-coach-pick' });
  setHtml(card, CARD);
  const mascot = queryOne(card, '.lr-ext-coach-pick__mascot', HTMLElement);
  let coach = pickCoach();
  let visible = false;
  // It comes in neutral, as its still looks, and smiles once drawn: the swap never shows.
  const spot = new MascotSpot({
    className: 'lr-ext-coach-pick__live',
    framing: 'bust',
    // Under the themes, it never holds up the page.
    whenIdle: true,
    onDrawn: holder => {
      setData(holder, 'lrExtLive', '');
      spot.sync(holder, 'happy', { coach });
    },
  });
  const show = (next: boolean): void => {
    if (next === visible) return;
    visible = next;
    // The review may have changed the coach since, in this tab or another.
    if (visible) coach = pickCoach();
    if (mascot && !visible) setData(mascot, 'lrExtLive', null);
    showPick(card, coach);
    spot.sync(visible ? mascot : null, 'neutral', { coach });
  };
  card.addEventListener('click', event => {
    const picked = CoachIdSchema.safeParse(
      closestTo(event.target, '.lr-ext-coach-choice', HTMLElement)?.dataset.lrExtCoachChoice,
    );
    if (!picked.success || picked.data === coach) return;
    coach = picked.data;
    chooseCoach(coach);
    showPick(card, coach);
    spot.sync(mascot, 'happy', { coach });
    spot.poke();
  });
  showPick(card, coach);
  return { element: card, show };
}
