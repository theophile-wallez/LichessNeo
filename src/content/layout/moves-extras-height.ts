import { queryOne, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { createSizeWatch } from './size-watch.ts';

// Lichess's voice bar, the players' crosstable and the keyboard-move input sit
// over the panel, whose part on show makes room for them
// (styles/game/moves-extras.css, styles/panel-tabs.css): their heights go into
// `--ln-ext-voice-h`, `--ln-ext-crosstable-h` and `--ln-ext-keyboard-h`. They
// wrap or grow with the panel's width and the player's language, so they're
// measured. At a game's end Lichess leaves an empty crosstable before the new
// one, hidden by the stylesheet: the filled one is measured. The analysis pages
// only have the input, which stands over the chat's own.

const EXTRAS: readonly (readonly [selector: string, variable: string])[] = [
  ['#voice-bar', '--ln-ext-voice-h'],
  ['.round__underboard > .crosstable:not(:empty)', '--ln-ext-crosstable-h'],
  ['.keyboard-move', '--ln-ext-keyboard-h'],
];

interface Extras {
  readonly main: HTMLElement;
  /** Each extra in `EXTRAS`' order, null where Lichess has none. */
  readonly found: readonly (Element | null)[];
}

function findExtras(): Extras | null {
  const main = queryOne(document, 'main.round, main.analyse', HTMLElement);
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
  let extras: Extras | null = null;
  const watch = createSizeWatch(() => {
    if (extras) setHeights(extras);
  });
  return () => {
    extras = findExtras();
    if (!extras) return;
    watch.watch([extras.main, ...extras.found.filter(extra => extra !== null)]);
  };
}

export const movesExtrasHeight: Feature = {
  name: 'moves extras height',
  start: () => onEveryTick('moves extras height', watchMovesExtras()),
};
