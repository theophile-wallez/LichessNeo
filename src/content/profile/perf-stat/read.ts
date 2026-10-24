import { lichessRatingIn } from '#shared/chesscom-rating/swap.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { nonEmpty } from '#shared/text.ts';

// What a rating's stats page (/@/<user>/perf/<perf>) says, read off the
// markup lila serves: its numbers, and its labels in the page's language, so
// the cards built from them need no words of their own.

/** A game a figure links to, and when it was played (an ISO date). */
export interface GameAt {
  readonly href: string;
  readonly at: string;
}

/** A label and a value as Lichess wrote them, its share of the games where it has one. */
export interface Figure {
  readonly label: string;
  readonly value: string;
  readonly share: string;
}

export interface Glicko {
  readonly label: string;
  /** Lichess's own rating, not its Chess.com equivalent, whole. */
  readonly rating: number;
  /** "2460" as Lichess writes it ("1500?" while provisional), to the unit. */
  readonly written: string;
  /** The share of players it beats ("99.9%"), null while provisional. */
  readonly percentile: string | null;
  readonly sentence: string;
  readonly progress: { readonly label: string; readonly value: number } | null;
  readonly deviation: {
    readonly label: string;
    readonly value: string;
    readonly tip: string;
  } | null;
}

export interface Extreme {
  readonly label: string;
  readonly rating: number;
  readonly game: GameAt | null;
}

export interface StreakValue {
  readonly label: string;
  /** The count in its own tag ("47"), or null where the value is a duration or none. */
  readonly count: string | null;
  /** The rest of the value: the count's unit ("games"), or all of it ("3 days, 5 hours"). */
  readonly rest: string;
  readonly from: GameAt | null;
  readonly to: GameAt | null;
}

export interface Streak {
  readonly title: string;
  /** What the title means, where Lichess explains it ("Less than one hour between games"). */
  readonly tip: string;
  readonly kind: 'win' | 'loss' | 'play' | 'time';
  readonly longest: StreakValue;
  readonly current: StreakValue | null;
}

export interface Opponent {
  readonly href: string;
  readonly name: string;
  readonly title: { readonly text: string; readonly tip: string } | null;
  readonly flair: string | null;
  readonly rating: string;
  readonly game: GameAt | null;
}

export interface OpponentList {
  readonly title: string;
  readonly kind: 'best' | 'worst';
  readonly opponents: readonly Opponent[];
}

const COLON = /[\s ]*:[\s ]*$/;

/** A label Lichess ends with a colon ("Rating:", "Série actuelle :"), without it. */
export const withoutColon = (text: string): string => text.trim().replace(COLON, '').trim();

const text = (element: Element | null | undefined): string => element?.textContent.trim() ?? '';

/** The element's own text, before its first tag. */
function leadingText(element: Element): string {
  const first = element.firstChild;
  return first instanceof Text ? first.data : '';
}

function gameAt(link: HTMLAnchorElement | null): GameAt | null {
  const at = link && queryOne(link, 'time', HTMLTimeElement)?.dateTime;
  return link && at ? { href: link.getAttribute('href') ?? '', at } : null;
}

function readProgress(line: HTMLElement): Glicko['progress'] {
  const progress = queryOne(line, '.progress', HTMLElement);
  const digits = /\d+/.exec(text(progress))?.[0];
  if (!progress || digits === undefined) return null;
  const sign = queryOne(progress, 'red, bad', HTMLElement) ? -1 : 1;
  return { label: withoutColon(leadingText(line)), value: sign * Number(digits) };
}

function readDeviation(line: HTMLElement): Glicko['deviation'] {
  const strong = queryOne(line, ':scope > strong', HTMLElement);
  const before = strong?.previousSibling;
  if (!strong || !(before instanceof Text)) return null;
  const label = withoutColon(before.data.replace(/^[\s.]+/, ''));
  return { label, value: text(strong), tip: strong.title };
}

/** The rating, the share of players it beats, and how it moved and how sure it is. */
export function readGlicko(content: ParentNode): Glicko | null {
  const heading = queryOne(content, 'section.glicko > h2', HTMLElement);
  const strong = heading && queryOne(heading, ':scope > strong', HTMLElement);
  const rating = strong && lichessRatingIn(strong);
  if (!heading || !strong || rating === null || rating === undefined) return null;
  const details = queryOne(heading, '.details', HTMLElement);
  const line = queryOne(content, 'section.glicko > p', HTMLElement);
  return {
    label: withoutColon(leadingText(heading)),
    rating: Math.round(rating),
    written: `${Math.round(rating)}${strong.textContent.includes('?') ? '?' : ''}`,
    percentile: nonEmpty(details && text(queryOne(details, 'strong', HTMLElement))) ?? null,
    sentence: text(details),
    progress: line && readProgress(line),
    deviation: line && readDeviation(line),
  };
}

/** A row of the counts' tables: its label, its number, and its share in the next cell. */
export function readFigure(row: HTMLTableRowElement): Figure {
  const [value, share] = queryAll(row, ':scope > td', HTMLTableCellElement);
  return {
    label: text(queryOne(row, ':scope > th', HTMLElement)),
    value: text(value),
    share: text(share),
  };
}

/** The counts' two tables, row by row: the games, then the opponents and results. */
export function readFigures(content: ParentNode): readonly (readonly Figure[])[] {
  return queryAll(content, 'section.counter table', HTMLTableElement).map(table =>
    queryAll(table, 'tr', HTMLTableRowElement).map(readFigure),
  );
}

function readExtreme(block: HTMLElement): Extreme | null {
  const heading = queryOne(block, ':scope > h2', HTMLElement);
  const rating = Number.parseInt(text(heading && queryOne(heading, 'strong', HTMLElement)), 10);
  if (!heading || Number.isNaN(rating)) return null;
  const game = gameAt(queryOne(block, ':scope > a', HTMLAnchorElement));
  return { label: withoutColon(leadingText(heading)), rating, game };
}

/** The highest rating, then the lowest, either missing before a first rated game. */
export function readExtremes(content: ParentNode): readonly [Extreme | null, Extreme | null] {
  const [highest, lowest] = queryAll(content, 'section.highlow > div', HTMLElement);
  return [highest ? readExtreme(highest) : null, lowest ? readExtreme(lowest) : null];
}

/** One `.streak`: "Longest streak: <strong>47</strong> games", from a game to another. */
export function readStreakValue(streak: HTMLElement): StreakValue | null {
  const heading = queryOne(streak, ':scope > h3', HTMLElement);
  if (!heading) return null;
  const [label = '', ...value] = heading.textContent.split(':');
  const count = queryOne(heading, 'strong', HTMLElement)?.textContent.trim() ?? null;
  const written = value.join(':').trim();
  const rest = count === null ? written : written.replace(count, '').trim();
  const [from = null, to = null] = queryAll(streak, ':scope > a', HTMLAnchorElement).map(gameAt);
  return { label: label.trim(), count, rest, from, to };
}

function readStreak(
  block: HTMLElement,
  title: HTMLElement | null,
  kind: Streak['kind'],
): Streak | null {
  const [longest, current] = queryAll(block, '.streak', HTMLElement).map(readStreakValue);
  if (!title || !longest) return null;
  return { title: text(title), tip: title.title, kind, longest, current: current ?? null };
}

/** The winning and losing streaks, then the games played in a row and the time spent so. */
export function readStreaks(content: ParentNode): readonly Streak[] {
  const results = queryAll(content, 'section.resultStreak > div', HTMLElement).map((block, index) =>
    readStreak(block, queryOne(block, ':scope > h2', HTMLElement), index === 0 ? 'win' : 'loss'),
  );
  const plays = queryAll(content, 'section.playStreak', HTMLElement).map((section, index) =>
    readStreak(
      section,
      queryOne(section, ':scope > h2 > span', HTMLElement),
      index === 0 ? 'play' : 'time',
    ),
  );
  return [...results, ...plays].filter(streak => streak !== null);
}

function readOpponent(row: HTMLTableRowElement): Opponent | null {
  const link = queryOne(row, 'a.user-link', HTMLAnchorElement);
  if (!link) return null;
  const badge = queryOne(link, '.utitle', HTMLElement);
  const name = [...link.childNodes]
    .filter(node => node instanceof Text)
    .map(node => node.textContent);
  const rating = /\d+/.exec(link.parentElement?.textContent.replace(link.textContent, '') ?? '');
  return {
    href: link.getAttribute('href') ?? '',
    name: name.join('').trim(),
    title: badge ? { text: text(badge), tip: badge.title } : null,
    flair: queryOne(link, 'img.uflair', HTMLImageElement)?.getAttribute('src') ?? null,
    rating: rating?.[0] ?? '',
    game: gameAt(queryOne(row, 'a.glpt', HTMLAnchorElement)),
  };
}

/** The best rated victories, and the worst defeats where the page shows them. */
export function readOpponents(content: ParentNode): readonly OpponentList[] {
  return queryAll(content, 'section.result table', HTMLTableElement).map((table, index) => ({
    title: text(queryOne(table, 'thead h2', HTMLElement)),
    kind: index === 0 ? 'best' : 'worst',
    opponents: queryAll(table, 'tbody > tr', HTMLTableRowElement)
      .map(readOpponent)
      .filter(opponent => opponent !== null),
  }));
}
