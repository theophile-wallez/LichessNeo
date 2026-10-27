import { gameIdFrom } from '#shared/game-path.ts';
import { nonEmpty } from '#shared/text.ts';

// TV shows its games at /tv/<channel> and swaps them without a reload, so the
// path has no game id: the analysis button links to the game on show.

/** The id of the game the page shows, on its own page or on TV. */
export function currentGameId(): string | null {
  const link = document.querySelector('main.round :is(i5d, rm6) a.analysis')?.getAttribute('href');
  return gameIdFrom(nonEmpty(link) ?? location.pathname);
}
