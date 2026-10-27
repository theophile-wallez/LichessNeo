import { FOLDED_CARD, UNFOLD_CHEVRON } from '#shared/card-fold.ts';
import { type CoachOptions, coachOptions, keepCoachOptions, shownCoach } from '#shared/coach.ts';
import { closestTo, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onCoachState, postCoachOptions, type CoachState } from '#shared/protocol.ts';
import { onSettings, type Settings } from '#content/settings/settings.ts';
import { loadMascots } from './load.ts';
import type { MascotView } from './mascot/index.ts';

// Brings the Game Review's coach to life. The page world draws the coach's
// avatar and posts which coach it is, its mood about the move and whether it's
// talking (the comment typing out); this plays the coach's 3D mascot in it.
// The puzzle page's coach is drawn here and played the same way.
// It runs here rather than in the page world because the mascots' bundle is
// the extension's, which the page's CSP keeps out of reach. Until it's in, or
// without WebGL or with the settings keeping the coaches still, the avatar
// shows the coach's still image. In a folded game over's card, it waits for the
// card to open: the bundle and the scene cost something, and it wouldn't be seen.

const LIVE_CLASS = 'ln-ext-coach__avatar--live';

let wanted: CoachState = { coach: 0, mood: 'neutral', talking: false };
// Drawn: its first frame is in, over the still, which goes then.
let live: { readonly avatar: HTMLElement; readonly mascot: MascotView; drawn: boolean } | null =
  null;
let mounting: HTMLElement | null = null;

function apply(mascot: MascotView): void {
  mascot.setCoach(wanted.coach);
  mascot.setMood(wanted.mood);
  mascot.setTalking(wanted.talking);
}

function unmount(): void {
  if (!live) return;
  live.mascot.destroy();
  live.avatar.classList.toggle(LIVE_CLASS, false);
  live = null;
}

async function mount(avatar: HTMLElement): Promise<void> {
  const face = queryOne(avatar, '.ln-ext-coach__face', HTMLElement);
  if (!face) return;
  mounting = avatar;
  const mountMascot = await loadMascots();
  if (mounting !== avatar) return;
  mounting = null;
  if (!mountMascot || !avatar.isConnected) return;
  const mascot = mountMascot(face, { onDrawn: () => reveal(mascot) });
  if (!mascot) return;
  unmount();
  live = { avatar, mascot, drawn: false };
  // Neutral, as its still looks, until it's drawn over it.
  mascot.setCoach(wanted.coach);
}

function reveal(mascot: MascotView | null): void {
  if (!live || live.mascot !== mascot) return;
  live.drawn = true;
  live.avatar.classList.toggle(LIVE_CLASS, true);
  apply(live.mascot);
}

function sync(): void {
  // With no coach, the stylesheet hides the avatar (coach-avatar.css): no mascot to play.
  if (shownCoach() === null) return unmount();
  const avatar = queryOne(document, '.ln-ext-coach__avatar', HTMLElement);
  if (!avatar) return;
  if (live?.avatar !== avatar && avatar.closest(FOLDED_CARD)) {
    // A mascot left in a panel drawn over goes now, rather than when the card opens.
    if (live && !live.avatar.isConnected) unmount();
    return;
  }
  if (live?.avatar === avatar) {
    if (live.drawn) apply(live.mascot);
    else live.mascot.setCoach(wanted.coach);
  } else if (mounting !== avatar) void mount(avatar);
}

/** Plays `state` on the page's coach: the review's, or the puzzle's (content/puzzle). */
export function showCoach(state: CoachState): void {
  wanted = state;
  sync();
}

// What the page world was last told, or read as it started.
let told: CoachOptions | null = null;

const sameOptions = (one: CoachOptions, other: CoachOptions): boolean =>
  one.motion === other.motion && one.analysis === other.analysis && one.board === other.board;

// Kept for the page world, which can't read the settings, and for the next page's first look;
// told to it too, as a page open in this tab doesn't hear its storage change.
function followSettings({ coachMotion, analysisCoach, coachBoard }: Settings): void {
  const options = { motion: coachMotion, analysis: analysisCoach, board: coachBoard };
  if (!told || !sameOptions(told, options)) {
    told = options;
    keepCoachOptions(options);
    postCoachOptions(options);
  }
  if (coachMotion) sync();
  else unmount();
}

export const coach: Feature = {
  name: 'coach',
  start: () => {
    onCoachState(showCoach);
    told = coachOptions();
    onSettings(followSettings);
    // The page world marks the card open in its own listener, which runs first, the
    // chevron being under the element it listens on.
    document.addEventListener('click', event => {
      if (closestTo(event.target, UNFOLD_CHEVRON, Element)) sync();
    });
  },
};
