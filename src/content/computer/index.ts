import { setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { MascotSpot } from '#content/coach/spot.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { syncLevelSlider } from './level-slider.ts';
import { levelMood } from './moods.ts';

// The computer's robot, live where a game against Stockfish is set up: beside
// the setup's level slider, its colors and mood following the level. Its still
// is the computer's avatar everywhere else (styles/theme).

// Over its still, which the stylesheet shows at once.
const setup = new MascotSpot({
  className: 'lr-ext-level__live',
  framing: 'bust',
  onDrawn: slot => setData(slot, 'lrExtLive', ''),
});
let pickedLevel = 0;

// Lichess draws the setup when a click opens it, and anew on some picks: the slider goes in
// before it's painted, not on the next tick, so its buttons never show.
const OPENING_FRAMES = 12;
const redraws = new MutationObserver(() => syncSetup());
let watched: Element | null = null;

/** Follows the open setup's redraws, and only them. */
function watch(dialog: Element | null): void {
  if (dialog === watched) return;
  redraws.disconnect();
  watched = dialog;
  if (dialog) redraws.observe(dialog, { childList: true, subtree: true });
}

/** The frames after a click, until a setup opens or a few have gone by. */
function syncAfterClick(frames: number): void {
  requestAnimationFrame(() => {
    syncSetup();
    if (!watched && frames > 1) syncAfterClick(frames - 1);
  });
}

function syncSetup(): void {
  const slider = syncLevelSlider();
  const level = slider?.level ?? 0;
  // It reacts to each new level, easing into its colors (mascot/cast/shell.ts).
  if (slider && pickedLevel !== 0 && level !== pickedLevel) setup.poke();
  pickedLevel = level;
  setup.sync(slider?.robot ?? null, levelMood(level), { computer: level });
  watch(slider?.robot.closest('dialog') ?? null);
}

export const computer: Feature = {
  name: 'computer',
  start: () => {
    document.addEventListener('click', () => syncAfterClick(OPENING_FRAMES), {
      capture: true,
      passive: true,
    });
    onEveryTick('computer robot', syncSetup);
  },
};
