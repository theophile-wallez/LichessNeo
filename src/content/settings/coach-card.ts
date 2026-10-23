import { CoachIdSchema, pickCoach } from '#shared/coach.ts';
import { closestTo, createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { chooseCoach } from '#content/bootstrap/coach-choice.ts';
import { coachChoices, coachName } from '#content/coach/names.ts';
import { MascotSpot } from '#content/coach/spot.ts';
import { currentSettings, onSettings } from './settings.ts';
import { buildSwitchList } from './switch-list.ts';

// The settings' Coach card, on the Profile & coach page, under the profile's cards
// (styles/pages/settings-coach.css): the coach, live over its still, says
// hello, over a tile for each coach. The pick is the one every coach shows
// (#shared/coach.ts): the review, the puzzles, the drills. Under it, the
// coach's switches: its 3D, its place on the analysis board, and its drawings
// on the board.

const CARD = html`<div class="ln-ext-coach-pick__head">
    <span class="ln-ext-setting__icon" aria-hidden="true"></span>
    <div>
      <h2 class="ln-ext-setting__title">${message('coachPickTitle')}</h2>
      <p class="ln-ext-setting__body">${message('coachPickBody')}</p>
    </div>
  </div>
  <div class="ln-ext-coach-pick__stage">
    <span class="ln-ext-coach-pick__mascot" aria-hidden="true"></span>
    <p class="ln-ext-coach-pick__bubble" aria-live="polite"></p>
  </div>
  <div class="ln-ext-coach-pick__grid">${coachChoices()}</div>`;

export interface CoachCard {
  readonly element: HTMLElement;
  /** Brings the coach in as its page shows, and takes it away as it hides. */
  readonly show: (visible: boolean) => void;
}

function showPick(card: HTMLElement, coach: number): void {
  const mascot = queryOne(card, '.ln-ext-coach-pick__mascot', HTMLElement);
  if (mascot) setData(mascot, 'lnExtAvatarCoach', String(coach));
  for (const choice of queryAll(card, '.ln-ext-coach-choice', HTMLElement)) {
    const pressed = String(choice.dataset.lnExtCoachChoice === String(coach));
    if (choice.getAttribute('aria-pressed') !== pressed)
      choice.setAttribute('aria-pressed', pressed);
  }
  // A new bubble each time, so it pops in again.
  const bubble = queryOne(card, '.ln-ext-coach-pick__bubble', HTMLElement);
  bubble?.replaceChildren(
    createElement('span', { text: message('coachPickHello', coachName(coach)) }),
  );
}

/** The card, its coach live only while its page shows. */
export function buildCoachCard(): CoachCard {
  const card = createElement('section', { className: 'ln-ext-coach-pick' });
  setHtml(card, CARD);
  const mascot = queryOne(card, '.ln-ext-coach-pick__mascot', HTMLElement);
  let coach = pickCoach();
  let visible = false;
  // It comes in neutral, as its still looks, and smiles once drawn: the swap never shows.
  const spot = new MascotSpot({
    className: 'ln-ext-coach-pick__live',
    framing: 'bust',
    // Under the themes, it never holds up the page.
    whenIdle: true,
    onDrawn: holder => {
      setData(holder, 'lnExtLive', '');
      spot.sync(holder, 'happy', { coach });
    },
  });
  const show = (next: boolean): void => {
    if (next === visible) return;
    visible = next;
    // The review may have changed the coach since, in this tab or another.
    if (visible) coach = pickCoach();
    if (mascot && !visible) setData(mascot, 'lnExtLive', null);
    showPick(card, coach);
    spot.sync(visible ? mascot : null, 'neutral', { coach });
  };
  // Taken off and put back as the 3D is switched: live, or its still.
  let moving = currentSettings().coachMotion;
  onSettings(({ coachMotion }) => {
    if (coachMotion === moving) return;
    moving = coachMotion;
    if (!visible) return;
    if (mascot) setData(mascot, 'lnExtLive', null);
    spot.sync(null, 'neutral', { coach });
    spot.sync(mascot, 'neutral', { coach });
  });
  card.addEventListener('click', event => {
    const picked = CoachIdSchema.safeParse(
      closestTo(event.target, '.ln-ext-coach-choice', HTMLElement)?.dataset.lnExtCoachChoice,
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

/** The coach's switches, under its card. */
export const buildCoachSwitches = (): HTMLElement =>
  buildSwitchList([
    {
      key: 'coachMotion',
      title: message('settingCoachMotion'),
      body: message('settingCoachMotionBody'),
    },
    {
      key: 'analysisCoach',
      title: message('settingAnalysisCoach'),
      body: message('settingAnalysisCoachBody'),
    },
    {
      key: 'coachBoard',
      title: message('settingCoachBoard'),
      body: message('settingCoachBoardBody'),
    },
  ]);
