import { speedOfGlyph, speedOfPath, speedOfTimeControl } from '#shared/chesscom-rating/speeds.ts';
import { closestTo, queryOne } from '#shared/dom.ts';

// Where Lichess writes a rating, and how to tell the speed it counts in.

export interface Spot {
  /** The elements whose own text is a rating. */
  readonly selector: string;
  /** The speed of their ratings, or null for one Chess.com has no pool for. */
  readonly speed: (element: HTMLElement) => string | null;
}

// The glyph of the element `selector` finds from `root`, a speed's or a variant's.
const glyphOf = (root: ParentNode | null | undefined, selector: string): string | null =>
  (root && queryOne(root, selector, HTMLElement)?.dataset.icon) ?? null;

// A game's page heads its info with its perf's glyph: a speed's, or a variant's.
const gameSpeed = (): string | null => speedOfGlyph(glyphOf(document, '.game__meta__infos'));

// A variant's rating is its own; a game from a position counts in its speed.
function miniGameSpeed(element: HTMLElement): string | null {
  const game = closestTo(element, '.mini-game:is(.standard, .fromPosition)', HTMLElement);
  return speedOfTimeControl(game?.dataset.tc);
}

export const SPOTS: readonly Spot[] = [
  // A game's player bars, ours on the analysis board, and its info.
  {
    selector: '.ruser > rating, .ln-ext-player > rating, .game__meta__players .rating',
    speed: gameSpeed,
  },
  { selector: '.mini-game__user > .rating', speed: miniGameSpeed },
  // A list of games, each headed by its perf's glyph.
  {
    selector: '.game-row__infos > .versus > .player',
    speed: element =>
      speedOfGlyph(glyphOf(element.closest('.game-row__infos'), ':scope > .header')),
  },
  // A profile's rating cards, also the menu of a rating's stats page, and that page's rating.
  {
    selector: '.side.sub-ratings > a rating > strong',
    speed: element => speedOfPath(element.closest('a')?.pathname),
  },
  { selector: '.perf-stat h2 > strong:first-child', speed: () => speedOfPath(location.pathname) },
  // The hover card's chips.
  {
    selector: '.upt__info__ratings > span[data-icon]',
    speed: element => speedOfGlyph(element.dataset.icon),
  },
  // The leaderboards: the players online, each rating with its glyph, then each speed's best.
  {
    selector: 'ol.user-top > li > span[data-icon]',
    speed: element => speedOfGlyph(element.dataset.icon),
  },
  {
    selector: 'section.user-top > ol > li',
    speed: element => speedOfGlyph(glyphOf(element.closest('section'), ':scope > h2')),
  },
  { selector: '.slist-leaderboard td:nth-child(3)', speed: () => speedOfPath(location.pathname) },
  // TV's channels; the top rated one's game may be of any speed, known only while it's shown.
  {
    selector: 'a.tv-channel:not(.best) .champion > rating',
    speed: element => speedOfGlyph(glyphOf(element.closest('a'), ':scope > span')),
  },
  { selector: 'a.tv-channel.best.active .champion > rating', speed: gameSpeed },
  // The lobby's seeks, whose glyph is in their mode's column.
  {
    selector: '.hooks__list tr.hook > td:nth-child(2)',
    speed: element => speedOfGlyph(glyphOf(element.parentElement, ':scope > td:last-child > span')),
  },
  // An arena's standings.
  {
    selector: '.tour__standing td.player .rating',
    speed: () => speedOfGlyph(glyphOf(document, '.tour__meta__head')),
  },
];
