import type { Feature } from '#shared/features.ts';
import { syncHeight } from './height.ts';
import { syncPicks } from './picks.ts';
import { followSetup } from './redraws.ts';

// The game setup dialog (create a game, challenge a friend, play the computer):
// its choices as tiles, switching Lichess's own controls under them, and its
// height easing as they do.

export const gameSetup: Feature = {
  name: 'game setup',
  start: () =>
    followSetup('game setup', () => {
      syncPicks();
      syncHeight();
    }),
};
