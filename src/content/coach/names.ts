import ShuffleIcon from '@hugeicons/core-free-icons/ShuffleIcon';
import UnavailableIcon from '@hugeicons/core-free-icons/UnavailableIcon';
import {
  type COACH_COUNT,
  type CoachPick,
  CoachPickSchema,
  NO_COACH,
  OFFERED_COACHES,
  RANDOM_COACH,
} from '#shared/coach.ts';
import { closestTo } from '#shared/dom.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon } from '#shared/hugeicons.ts';
import { message } from '#content/platform/runtime.ts';

// The coaches' names, and their tiles: the settings' coach cards and the review's
// coach picker show the same grid (styles/pages/settings-coach.css), led by no
// coach and one at random.

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
  html`<button type="button" class="ln-ext-coach-choice" data-ln-ext-coach-choice="${i + 1}" aria-pressed="false">
    <span class="ln-ext-coach-choice__face" data-ln-ext-avatar-coach="${i + 1}"></span>
    <span class="ln-ext-coach-choice__name">${message(name)}</span>
  </button>`;

/** The glyph of a pick that isn't a coach. */
export const pickIcon = (pick: typeof NO_COACH | typeof RANDOM_COACH): SafeHtml =>
  hugeicon(pick === NO_COACH ? UnavailableIcon : ShuffleIcon);

const pickMarkup = (pick: typeof NO_COACH | typeof RANDOM_COACH, name: string): SafeHtml =>
  html`<button type="button" class="ln-ext-coach-choice" data-ln-ext-coach-choice="${pick}" aria-pressed="false">
    <span class="ln-ext-coach-choice__face ln-ext-coach-choice__face--icon" aria-hidden="true">${pickIcon(pick)}</span>
    <span class="ln-ext-coach-choice__name">${message(name)}</span>
  </button>`;

/** No coach and one at random, then a tile for each coach offered, none pressed. */
export const coachChoices = (): SafeHtml[] => [
  pickMarkup(NO_COACH, 'coachNone'),
  pickMarkup(RANDOM_COACH, 'coachRandom'),
  ...NAMES.flatMap((name, i) => (OFFERED_COACHES.includes(i + 1) ? [choiceMarkup(name, i)] : [])),
];

/** The pick of the tile `target` is in, or null outside the tiles. */
export function tilePick(target: EventTarget | null): CoachPick | null {
  const tile = closestTo(target, '.ln-ext-coach-choice', HTMLElement);
  const pick = CoachPickSchema.safeParse(tile?.dataset.lnExtCoachChoice);
  return pick.success ? pick.data : null;
}
