import { setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { message } from '#content/platform/runtime.ts';
import { onEveryTick } from '#content/sync-loop.ts';

// In Zen, Lichess's "Zen mode" button (#zentog) is the way out, but it says only "Zen mode":
// styles/game/zen.css shows these words in its place, from the button's data-ln-ext-label.

export function syncZenExit(): void {
  const toggle = document.getElementById('zentog');
  if (toggle) setData(toggle, 'lnExtLabel', message('zenExit'));
}

export const zenExit: Feature = {
  name: 'zen exit',
  start: () => onEveryTick('zen exit', syncZenExit),
};
