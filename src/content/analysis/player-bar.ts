import { lichessRatingOf } from '#shared/chesscom-rating/swap.ts';
import { createCustomElement, queryOne } from '#shared/dom.ts';

// A bar in the markup of the round's `.ruser` (name, <rating>, rating
// change), so both pages share one style (styles/playerbar.css).

// The rating's change: `good`, `bad`, or a bare span for "±0".
const CHANGE = 'good, bad, :scope > span:not([class])';

function userParts(link: HTMLAnchorElement): Element[] {
  // Lichess's rating, which the bar shows as on Chess.com in its turn.
  const source = queryOne(link, '.rating', HTMLElement);
  const rating = source && lichessRatingOf(source).replace(/[()\s]/g, '');
  const change = link.querySelector(CHANGE);
  for (const extra of link.querySelectorAll(`.rating, ${CHANGE}`)) extra.remove();
  // The title's badge has its own margin: drop the no-break space after it
  // (trim() counts it as white space).
  for (const node of link.childNodes) if (node instanceof Text) node.data = node.data.trim();
  const parts: Element[] = [link];
  if (rating) parts.push(createCustomElement('rating', { text: rating }));
  if (change) parts.push(change);
  return parts;
}

/** Fills `bar` from a player of the game info (`.game__meta__players .player`). */
export function fillPlayerBar(bar: HTMLElement, source: Element | null): void {
  const link = source && queryOne(source, 'a.user-link', HTMLAnchorElement);
  const copy = link?.cloneNode(true);
  if (copy instanceof HTMLAnchorElement) {
    bar.replaceChildren(...userParts(copy));
    return;
  }
  // Anonymous, or the computer.
  bar.replaceChildren(createCustomElement('name', { text: source?.textContent.trim() ?? '' }));
}
