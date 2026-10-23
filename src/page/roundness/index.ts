import type { Feature } from '#shared/features.ts';
import { onRoundness } from '#shared/protocol.ts';
import { savePref } from '#page/lichess/prefs.ts';

// The Roundness set in the extension's settings, already on the page, saved
// as Lichess's own once it rests a second, as its Theme menu's slider saves it
// (lila's ui/dasher/src/interfaces.ts).

const SAVE_DELAY_MS = 1000;

export const roundness: Feature = {
  name: 'roundness',
  start: () => {
    let pending: ReturnType<typeof setTimeout> | undefined;
    onRoundness(radius => {
      clearTimeout(pending);
      pending = setTimeout(() => void savePref('uiRoundness', String(radius)), SAVE_DELAY_MS);
    });
  },
};
