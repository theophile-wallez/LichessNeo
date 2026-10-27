import { type CoachPick, coachOf, coachPick, NO_COACH } from '#shared/coach.ts';
import { createElement, queryAll, queryOne, setData } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';
import { chooseCoach } from '#content/bootstrap/coach-choice.ts';
import { coachChoices, coachName, tilePick } from '#content/coach/names.ts';
import { MascotSpot } from '#content/coach/spot.ts';
import { buildSwitchList } from './switch-list.ts';

// The settings' Coach card, on the Profile & coach page, under the profile's cards
// (styles/pages/settings-coach.css): the coach, live over its still, says
// hello, over a tile for each coach, after no coach and one at random. The
// pick is the one every coach's place shows (#shared/coach.ts): the review,
// the puzzles, the drills. With none, the stage says so alone. Under it, the
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

/** What the stage says of `pick`, which shows `coach` here. */
function hello(pick: CoachPick, coach: number | null): string {
  if (coach === null) return message('coachPickNone');
  const name = coachName(coach);
  return pick === coach ? message('coachPickHello', name) : message('coachPickRandom', name);
}

function showPick(card: HTMLElement, pick: CoachPick): void {
  const coach = coachOf(pick);
  const mascot = queryOne(card, '.ln-ext-coach-pick__mascot', HTMLElement);
  if (mascot) {
    setData(mascot, 'lnExtAvatarCoach', coach === null ? null : String(coach));
    if (mascot.hidden !== (coach === null)) mascot.hidden = coach === null;
  }
  for (const choice of queryAll(card, '.ln-ext-coach-choice', HTMLElement)) {
    const pressed = String(choice.dataset.lnExtCoachChoice === String(pick));
    if (choice.getAttribute('aria-pressed') !== pressed)
      choice.setAttribute('aria-pressed', pressed);
  }
  // A new bubble each time, so it pops in again.
  const bubble = queryOne(card, '.ln-ext-coach-pick__bubble', HTMLElement);
  bubble?.replaceChildren(createElement('span', { text: hello(pick, coach) }));
}

/** The card, its coach live only while its page shows. */
export function buildCoachCard(): CoachCard {
  const card = createElement('section', { className: 'ln-ext-coach-pick' });
  setHtml(card, CARD);
  const mascot = queryOne(card, '.ln-ext-coach-pick__mascot', HTMLElement);
  let pick = coachPick();
  let visible = false;
  // It comes in neutral, as its still looks, and smiles once drawn: the swap never shows.
  const spot = new MascotSpot({
    className: 'ln-ext-coach-pick__live',
    framing: 'bust',
    // Under the themes, it never holds up the page.
    whenIdle: true,
    onDrawn: holder => play(holder, 'happy'),
  });
  // The pick's coach on the stage, or none.
  const play = (holder: HTMLElement | null, mood: 'neutral' | 'happy'): void => {
    const coach = coachOf(pick);
    spot.sync(coach === null ? null : holder, mood, { coach: coach ?? 1 });
  };
  const show = (next: boolean): void => {
    if (next === visible) return;
    visible = next;
    // The review may have changed the coach since, in this tab or another.
    if (visible) pick = coachPick();
    showPick(card, pick);
    play(visible ? mascot : null, 'neutral');
  };
  card.addEventListener('click', event => {
    const picked = tilePick(event.target);
    if (picked === null || picked === pick) return;
    pick = picked;
    chooseCoach(pick);
    showPick(card, pick);
    if (pick === NO_COACH) return play(null, 'neutral');
    play(mascot, 'happy');
    spot.poke();
  });
  showPick(card, pick);
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
