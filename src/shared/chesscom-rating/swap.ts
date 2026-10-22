import { setData } from '#shared/dom.ts';
import { chesscomRating, chesscomRatingChange } from './convert.ts';
import type { RatingSpan } from './convert.ts';

// With the settings' Chess.com ratings on, a rating Lichess wrote is swapped
// for its equivalent in place: only the digits of its text change, so
// snabbdom keeps its nodes. The element keeps the Lichess rating, for the
// tooltip and to swap it back; Lichess writing another one starts over. The
// change beside a rating is swapped the same way, and on the same keys.

const NUMBER = /\d+(?:\.\d+)?/;

// A change's sign is its tag's where it has one (a profile writes `bad` and
// draws the sign in CSS), else the one in its text. "±0" has neither, and
// needs none: it's the same change on both scales.
const SIGN = /[-−+]/;

// The rating is a text of the element's own: a child's (a name with digits) is not.
function ratingNode(element: HTMLElement): Text | null {
  for (const node of element.childNodes)
    if (node instanceof Text && NUMBER.test(node.data)) return node;
  return null;
}

const numberIn = (node: Text): string => NUMBER.exec(node.data)?.[0] ?? '';

// Which way a change goes: nothing where Lichess says nothing, as with "±0".
function signOf(element: HTMLElement, node: Text): number | null {
  if (element.tagName === 'GOOD') return 1;
  if (element.tagName === 'BAD') return -1;
  const written = SIGN.exec(node.data)?.[0];
  if (written === undefined) return null;
  return written === '+' ? 1 : -1;
}

/** The rating Lichess wrote in `element`, swapped or not. */
export function lichessRatingOf(element: HTMLElement): string {
  return element.dataset.lnExtLichessRating ?? element.textContent;
}

/**
 * The number of the rating Lichess wrote in `element`, swapped or not: its
 * own text, so a name's digits beside it (a game row's player) don't count.
 */
export function lichessRatingIn(element: HTMLElement): number | null {
  const node = ratingNode(element);
  const digits = element.dataset.lnExtLichessRating ?? (node ? numberIn(node) : '');
  return digits === '' ? null : Number(digits);
}

interface Swap {
  /** The digits Lichess wrote, which the element keeps. */
  readonly lichess: string;
  /** The digits shown in their place. */
  readonly equivalent: string;
  /** What Lichess wrote in full, for the tooltip. */
  readonly tip: string;
}

// Shows `equivalent` in place of `lichess` in `node`, the element's own text.
function show(element: HTMLElement, node: Text, swap: Swap): void {
  node.data = node.data.replace(swap.lichess, swap.equivalent);
  // Lichess's own title would take the tooltip's place: it goes after ours.
  const title = element.dataset.lnExtTitle ?? element.title;
  if (element.title) {
    setData(element, 'lnExtTitle', title);
    element.removeAttribute('title');
  }
  setData(element, 'lnExtLichessRating', swap.lichess);
  setData(element, 'lnExtChesscomRating', swap.equivalent);
  setData(element, 'lnExtTip', title ? `${swap.tip} · ${title}` : swap.tip);
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
  show(element, node, { lichess: shown, equivalent: String(equivalent.rating), tip: tip(shown) });
}

/** The rating a change stands beside, and whether it's the one before it. */
export interface BesideRating {
  readonly rating: number;
  readonly shows: 'before' | 'after';
}

// The ratings a change of `change` sits between, from the one shown beside it.
const span = (beside: BesideRating, change: number): RatingSpan =>
  beside.shows === 'before'
    ? { before: beside.rating, after: beside.rating + change }
    : { before: beside.rating - change, after: beside.rating };

/**
 * Shows the Chess.com equivalent of the rating change in `element`: the gap
 * between the two ratings it sits between, converted. Its sign is Lichess's,
 * the two scales rising together, so only its digits change.
 */
export function swapChange(
  element: HTMLElement,
  speed: string | null,
  beside: BesideRating,
  tip: (lichess: string) => string,
): void {
  const node = ratingNode(element);
  const shown = node && numberIn(node);
  const sign = node && signOf(element, node);
  if (!node || !shown || !sign || shown === element.dataset.lnExtChesscomRating) return;
  if (speed === null) return;
  const equivalent = chesscomRatingChange(speed, span(beside, sign * Number(shown)));
  if (equivalent === null) return;
  show(element, node, {
    lichess: shown,
    equivalent: String(Math.abs(equivalent)),
    tip: tip(`${sign < 0 ? '−' : '+'}${shown}`),
  });
}

/** Gives `element` back the rating, or the change, Lichess wrote. */
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
