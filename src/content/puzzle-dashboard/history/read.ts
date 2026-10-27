import { queryAll, queryOne } from '#shared/dom.ts';
import { parseBoardState, type BoardState } from '#shared/still-board.ts';

// The puzzle history as Lichess serves it (/training/history): sessions,
// newest first, each a title, a time and its rounds, a mini board each, its
// class saying whether it was solved (`good`) or not (`bad`).

export const SESSION = '.puzzle-history__session';

export interface Round {
  /** The puzzle's own page. */
  readonly href: string;
  readonly solved: boolean;
  readonly board: BoardState | null;
}

export interface Session {
  /** When it was played; null if Lichess's time can't be read. */
  readonly at: Date | null;
  readonly rounds: readonly Round[];
}

function readRound(link: HTMLAnchorElement): Round | null {
  const href = link.getAttribute('href');
  if (!href) return null;
  const state = queryOne(link, '.mini-board[data-state]', HTMLElement)?.dataset.state;
  return {
    href,
    solved: link.classList.contains('good'),
    board: state === undefined ? null : parseBoardState(state),
  };
}

export function readSession(session: HTMLElement): Session {
  const time = queryOne(session, '.puzzle-history__session__title time[datetime]', HTMLElement);
  const at = new Date(time?.getAttribute('datetime') ?? '');
  const rounds = queryAll(session, 'a.puzzle-history__round', HTMLAnchorElement)
    .map(readRound)
    .filter(round => round !== null);
  return { at: Number.isNaN(at.getTime()) ? null : at, rounds };
}

export const readSessions = (root: ParentNode): Session[] =>
  queryAll(root, SESSION, HTMLElement).map(readSession);
