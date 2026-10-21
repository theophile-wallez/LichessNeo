import { setData } from '#shared/dom.ts';
import { chesscomRating } from './convert.ts';

// With the settings' Chess.com ratings on, a rating Lichess wrote is swapped
// for its equivalent in place: only the digits of its text change, so
// snabbdom keeps its nodes. The element keeps the Lichess rating, for the
// tooltip and to swap it back; Lichess writing another one starts over.

const NUMBER = /\d+(?:\.\d+)?/;

// The rating is a text of the element's own: a child's (a name with digits) is not.
function ratingNode(element: HTMLElement): Text | null {
  for (const node of element.childNodes)
    if (node instanceof Text && NUMBER.test(node.data)) return node;
  return null;
}

const numberIn = (node: Text): string => NUMBER.exec(node.data)?.[0] ?? '';

/** The rating Lichess wrote in `element`, swapped or not. */
export function lichessRatingOf(element: HTMLElement): string {
  return element.dataset.lnExtLichessRating ?? element.textContent;
}

/**
 * Shows the Chess.com equivalent of `element`'s rating, of `speed`, with a
 * tooltip of `tip(lichessRating)`. A speed Chess.com has no pool for keeps it.
 */
export function swapRating(
  element: HTMLElement,
  speed: string | null,
  tip: (lichess: string) => string,
): void {
  const node = ratingNode(element);
  const shown = node && numberIn(node);
  if (!node || !shown || shown === element.dataset.lnExtChesscomRating) return;
  const equivalent = speed === null ? null : chesscomRating(speed, Number(shown));
  if (!equivalent) return;
  const rating = String(equivalent.rating);
  node.data = node.data.replace(shown, rating);
  // Lichess's own title would take the tooltip's place: it goes after ours.
  const title = element.dataset.lnExtTitle ?? element.title;
  if (element.title) {
    setData(element, 'lnExtTitle', title);
    element.removeAttribute('title');
  }
  setData(element, 'lnExtLichessRating', shown);
  setData(element, 'lnExtChesscomRating', rating);
  setData(element, 'lnExtTip', title ? `${tip(shown)} · ${title}` : tip(shown));
}

/** Gives `element` back the rating Lichess wrote. */
export function restoreRating(element: HTMLElement): void {
  const {
    lnExtLichessRating: lichess,
    lnExtChesscomRating: chesscom,
    lnExtTitle: title,
  } = element.dataset;
  const node = ratingNode(element);
  if (node && lichess && numberIn(node) === chesscom)
    node.data = node.data.replace(chesscom, lichess);
  if (title && !element.title) element.title = title;
  for (const key of ['lnExtLichessRating', 'lnExtChesscomRating', 'lnExtTitle', 'lnExtTip'])
    setData(element, key, null);
}
