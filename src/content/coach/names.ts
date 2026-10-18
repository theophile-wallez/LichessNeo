import type { COACH_COUNT } from '#shared/coach.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { message } from '#content/platform/runtime.ts';

// The coaches' names, and their tiles: the settings' coach card and the review's
// coach picker show the same grid (styles/pages/settings-coach.css).

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
  'coachMushroom',
  'coachSnail',
  'coachGhost',
  'coachCactus',
  'coachToast',
  'coachRook',
  'coachKnight',
  'coachBishop',
  'coachKing',
  'coachQueen',
  'coachBunny',
  'coachCat',
  'coachDragon',
  'coachBoiledEgg',
  'coachSoda',
  'coachCloud',
  'coachSlime',
  'coachStar',
] as const satisfies { length: typeof COACH_COUNT };

/** The name of the coach of number `coach`. */
export const coachName = (coach: number): string => message(NAMES[coach - 1] ?? NAMES[0]);

const choiceMarkup = (name: string, i: number): SafeHtml =>
  html`<button type="button" class="lr-ext-coach-choice" data-lr-ext-coach-choice="${i + 1}" aria-pressed="false">
    <span class="lr-ext-coach-choice__face" data-lr-ext-avatar-coach="${i + 1}"></span>
    <span class="lr-ext-coach-choice__name">${message(name)}</span>
  </button>`;

/** A tile for each coach, in their numbers' order, none pressed. */
export const coachChoices = (): SafeHtml[] => NAMES.map(choiceMarkup);
