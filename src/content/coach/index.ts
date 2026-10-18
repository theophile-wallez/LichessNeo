import { keepCoachOptions } from '#shared/coach.ts';
import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onCoachState, type CoachState } from '#shared/protocol.ts';
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
// shows the coach's still image.

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
  const avatar = queryOne(document, '.ln-ext-coach__avatar', HTMLElement);
  if (!avatar) return;
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

// Kept for the page world, which can't read the settings, and for the next page's first look.
function followSettings({ coachMotion, analysisCoach }: Settings): void {
  keepCoachOptions({ motion: coachMotion, analysis: analysisCoach });
  if (coachMotion) sync();
  else unmount();
}

export const coach: Feature = {
  name: 'coach',
  start: () => {
    onCoachState(showCoach);
    onSettings(followSettings);
  },
};
