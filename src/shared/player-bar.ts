import { userInHref } from './avatar.ts';
import { queryOne } from './dom.ts';
import { nonEmpty } from './text.ts';

// A player as their bar on the game page shows them, for the players' intro
// (content/game/intro) and the game over (page/game-over): the names are the
// page's own ("Anonymous", "Stockfish level 3" in its language).

export interface BarPlayer {
  readonly name: string;
  /** The user's id from their profile link; none for anonymous players and the computer. */
  readonly user: string | undefined;
  readonly title: string | undefined;
  readonly rating: string | undefined;
  readonly flag: string | undefined;
  readonly computer: boolean;
}

// A user's name is a profile link with the title in a span of its own; an
// anonymous player's or the computer's is a bare `name`.
function barName(bar: HTMLElement): string {
  const link = queryOne(bar, 'a.user-link', HTMLElement);
  if (!link) return bar.querySelector('name')?.textContent.trim() ?? '';
  const texts = [...link.childNodes].filter(node => node instanceof Text);
  return texts
    .map(node => node.data)
    .join('')
    .trim();
}

/** The player of a bar; the computer has no rating there, so it comes from its level. */
export function readPlayer(bar: HTMLElement, computerRating: string | undefined): BarPlayer {
  return {
    name: barName(bar),
    user: userInHref(bar.querySelector('a.user-link')?.getAttribute('href')),
    title: nonEmpty(bar.querySelector('.utitle')?.textContent.trim()),
    rating: computerRating ?? nonEmpty(bar.querySelector('rating')?.textContent.trim()),
    flag: nonEmpty(bar.dataset.lnExtFlag),
    computer: computerRating !== undefined,
  };
}
