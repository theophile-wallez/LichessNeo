import { speedOfGlyph, speedOfPath, speedOfTimeControl } from '#shared/chesscom-rating/speeds.ts';
import { closestTo, queryOne } from '#shared/dom.ts';

// Where Lichess writes a rating, and how to tell the speed it counts in.

export interface Spot {
  /** The elements whose own text is a rating. */
  readonly selector: string;
  /** The speed of their ratings, or null for one Chess.com has no pool for. */
  readonly speed: (element: HTMLElement) => string | null;
  /** The change Lichess writes beside the rating, where it writes one. */
  readonly change?: SpotChange;
}

export interface SpotChange {
  /** The element holding the change, found from the rating's. */
  readonly find: (rating: HTMLElement) => HTMLElement | null;
  /** Whether the rating shown is the one before the change, or after it. */
  readonly shows: 'before' | 'after';
}

// A change is `good` or `bad`, which say which way it goes (a profile's has
// no sign of its own, drawn in CSS); the span Lichess writes for "±0" is left
// out, as nothing of it changes.
const CHANGE = ':is(good, bad, .rp)';

// Where a change stands beside its rating differs (a bar's rating is a tag of
// its own, a profile's a `strong` inside its `rating`, a game row's the
// element's own text), so it's looked for in the block the two share.
const changeIn =
  (block: string) =>
  (rating: HTMLElement): HTMLElement | null => {
    const shared = rating.closest(block);
    return shared && queryOne(shared, CHANGE, HTMLElement);
  };

// A game's rating is the one it was played at, so its change is what it became.
const gameChange = { find: changeIn('.ruser, .ln-ext-player, .player'), shows: 'before' } as const;

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

// The progress chip beside a rating stats page's rating, our own (perf-stat/view-hero.ts).
function perfProgress(rating: HTMLElement): HTMLElement | null {
  const card = rating.closest('.ln-ext-perf__now');
  return card && queryOne(card, '.ln-ext-perf__chip[data-ln-ext-tone]', HTMLElement);
}

export const SPOTS: readonly Spot[] = [
  // A game's player bars, ours on the analysis board, and its info.
  {
    selector: '.ruser > rating, .ln-ext-player > rating, .game__meta__players .rating',
    speed: gameSpeed,
    change: gameChange,
  },
  { selector: '.mini-game__user > .rating', speed: miniGameSpeed },
  // A list of games, each headed by its perf's glyph.
  {
    selector: '.game-row__infos > .versus > .player',
    speed: element =>
      speedOfGlyph(glyphOf(element.closest('.game-row__infos'), ':scope > .header')),
    change: gameChange,
  },
  // A profile's rating cards, also the menu of a rating's stats page, and that page's rating.
  // Their rating is today's, and the progress beside it where it stood a dozen games ago.
  {
    selector: '.side.sub-ratings > a rating > strong',
    speed: element => speedOfPath(element.closest('a')?.pathname),
    change: { find: changeIn('rating'), shows: 'after' },
  },
  { selector: '.perf-stat h2 > strong:first-child', speed: () => speedOfPath(location.pathname) },
  // Our cards of that page (content/profile/perf-stat): the rating with its progress, where it
  // stands between its lowest and highest, and the opponents' ratings.
  {
    selector: '.ln-ext-perf__rating',
    speed: () => speedOfPath(location.pathname),
    change: { find: perfProgress, shows: 'after' },
  },
  {
    selector:
      '.ln-ext-perf__bar > em, .ln-ext-perf__end > b, .ln-ext-perf__opponent .ln-ext-perf__pill',
    speed: () => speedOfPath(location.pathname),
  },
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
  // An arena's standings and its player's card, then a Swiss's, each its speed in its info's glyph.
  {
    selector: '.tour__standing td.player .rating, .tour__player-info .stats h2 .rating',
    speed: () => speedOfGlyph(glyphOf(document, '.tour__meta__head')),
  },
  {
    selector: '.swiss__standing td.player .rating, .swiss__player-info .stats h2 .rating',
    speed: () => speedOfGlyph(glyphOf(document, '.swiss__meta > section[data-icon]')),
  },
];
