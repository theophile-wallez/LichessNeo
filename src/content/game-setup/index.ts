import type { Feature } from '#shared/features.ts';
import { syncPicks } from './picks.ts';
import { followSetup } from './redraws.ts';
import { syncPanelMotion } from './panel-motion.ts';

// The game setup dialog (create a game, challenge a friend, play the computer):
// its choices as tiles, switching Lichess's own controls under them, and the
// panel under them easing to its new content as it changes.

export const gameSetup: Feature = {
  name: 'game setup',
  start: () =>
    followSetup('game setup', () => {
      syncPicks();
      syncPanelMotion();
    }),
};
