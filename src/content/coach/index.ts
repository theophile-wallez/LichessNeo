import { queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onCoachState, type CoachState } from '#shared/protocol.ts';
import { loadMascots } from './load.ts';
import type { MascotView } from './mascot/index.ts';

// Brings the Game Review's coach to life. The page world draws the coach's
// avatar and posts which coach it is, its mood about the move and whether it's
// talking (the comment typing out); this plays the coach's 3D mascot in it.
// The puzzle page's coach is drawn here and played the same way.
// It runs here rather than in the page world because the mascots' bundle is
// the extension's, which the page's CSP keeps out of reach. Until it's in, or
// without WebGL, the avatar shows the coach's still image.

const LIVE_CLASS = 'cdc-coach__avatar--live';

let wanted: CoachState = { coach: 0, mood: 'neutral', talking: false };
let live: { readonly avatar: HTMLElement; readonly mascot: MascotView } | null = null;
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
  const face = queryOne(avatar, '.cdc-coach__face', HTMLElement);
  if (!face) return;
  mounting = avatar;
  const mountMascot = await loadMascots();
  if (mounting !== avatar) return;
  mounting = null;
  if (!mountMascot || !avatar.isConnected) return;
  const mascot = mountMascot(face);
  if (!mascot) return;
  unmount();
  live = { avatar, mascot };
  avatar.classList.toggle(LIVE_CLASS, true);
  apply(mascot);
}

function sync(): void {
  const avatar = queryOne(document, '.cdc-coach__avatar', HTMLElement);
  if (!avatar) return;
  if (live?.avatar === avatar) apply(live.mascot);
  else if (mounting !== avatar) void mount(avatar);
}

/** Plays `state` on the page's coach: the review's, or the puzzle's (content/puzzle). */
export function showCoach(state: CoachState): void {
  wanted = state;
  sync();
}

export const coach: Feature = {
  name: 'coach',
  start: () => {
    onCoachState(showCoach);
  },
};
