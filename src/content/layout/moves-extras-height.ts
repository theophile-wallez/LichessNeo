import { queryOne, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { createSizeWatch } from './size-watch.ts';

// On the game page, Lichess's voice bar and the players' crosstable sit over
// the moves, which make room for them (styles/game/moves-extras.css): their
// heights go into `--lr-ext-voice-h` and `--lr-ext-crosstable-h`. Both wrap or grow
// with the panel's width and the player's language, so they're measured.

const EXTRAS: readonly (readonly [selector: string, variable: string])[] = [
  ['#voice-bar', '--lr-ext-voice-h'],
  ['.round__underboard > .crosstable', '--lr-ext-crosstable-h'],
];

interface Extras {
  readonly main: HTMLElement;
  /** Each extra in `EXTRAS`' order, null where Lichess has none. */
  readonly found: readonly (Element | null)[];
}

function findExtras(): Extras | null {
  const main = queryOne(document, 'main.round', HTMLElement);
  return main ? { main, found: EXTRAS.map(([selector]) => main.querySelector(selector)) } : null;
}

function setHeights({ main, found }: Extras): void {
  for (const [i, [, variable]] of EXTRAS.entries()) {
    const extra = found[i];
    const height = extra ? `${Math.ceil(extra.getBoundingClientRect().height)}px` : null;
    setStyleProperty(main, variable, height);
  }
}

/** A tick that measures the extras when they're new or resized, never otherwise. */
export function watchMovesExtras(): () => void {
  const watch = createSizeWatch();
  return () => {
    const extras = findExtras();
    if (!extras) return;
    const present = extras.found.filter(extra => extra !== null);
    if (watch.changed([extras.main, ...present])) setHeights(extras);
  };
}

export const movesExtrasHeight: Feature = {
  name: 'moves extras height',
  start: () => onEveryTick('moves extras height', watchMovesExtras()),
};
