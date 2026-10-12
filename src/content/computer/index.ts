import { setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { MascotSpot } from '#content/coach/spot.ts';
import { followSetup } from '#content/game-setup/redraws.ts';
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

function syncSetup(): void {
  const slider = syncLevelSlider();
  const level = slider?.level ?? 0;
  // It reacts to each new level, easing into its colors (mascot/cast/shell.ts).
  if (slider && pickedLevel !== 0 && level !== pickedLevel) setup.poke();
  pickedLevel = level;
  setup.sync(slider?.robot ?? null, levelMood(level), { computer: level });
}

export const computer: Feature = {
  name: 'computer',
  start: () => followSetup('computer robot', syncSetup),
};
