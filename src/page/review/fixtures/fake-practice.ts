import { START_FEN, writePlacement } from '#shared/chess/fen.ts';
import { playLine } from '#shared/chess/san.ts';
import { type Color, opposite } from '#shared/chess/types.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { analysis, type Analysis } from '#page/lichess/analysis.ts';
import type { ExplorerData, ExplorerDb } from '#page/lichess/explorer.ts';
import { en } from '#page/review/i18n/en.ts';
import { positionKey } from '#page/review/practice/state.ts';
import { createSession, type Mode, type Session } from '#page/review/session.ts';
import { watchClicks } from '#page/review/view/clicks.ts';
import { createElements } from '#page/review/view/elements.ts';
import { renderOpenings } from '#page/review/view/openings-page.ts';
import { followPractice } from '#page/review/view/practice-follow.ts';
import { type FakeController, fakeController, withFakeSite } from './fake-lichess.ts';
import { mountFakePage } from './fake-page.ts';

// Test support: the free analysis board with Lichess's opening explorer, for
// the practice page. The explorer answers each position from `books`, as the
// one on lichess.org answers the board's, and the session draws the practice
// page on each redraw, as a click's does.

export interface FakeExplorer {
  enabled: boolean;
  db: ExplorerDb;
  color: Color;
  player: string;
  ratings: number[];
  failing: boolean;
  signedIn: boolean;
  /** What it answers, by `positionKey`. */
  readonly books: Map<string, ExplorerData>;
  reloads: number;
}

export interface PracticeBoard {
  readonly ctrl: FakeController;
  readonly facade: Analysis;
  readonly explorer: FakeExplorer;
  readonly session: Session;
  /** The modes the session was asked for, in order. */
  readonly modes: Mode[];
  /** Lichess's practice against the computer, turned on (true) or off, in order. */
  readonly computer: boolean[];
}

/** The position after `moves` from the start, as the books key it. */
export function keyAfter(moves: readonly string[]): string {
  const played = playLine(moves);
  if (!played) throw new Error(`Not a line: ${moves.join(' ')}`);
  return `${writePlacement(played.board)} ${moves.length % 2 === 0 ? 'w' : 'b'}`;
}

type BookLine = readonly [san: string, uci: string, games: number];

/** The explorer's answer for a position: each move's games, all of them won by White. */
export const answer = (moves: readonly BookLine[], opening = ''): ExplorerData => ({
  white: moves.reduce((sum, [, , games]) => sum + games, 0),
  draws: 0,
  black: 0,
  moves: moves.map(([san, uci, games]) => ({
    san,
    uci,
    white: games,
    draws: 0,
    black: 0,
    opening: opening ? { eco: 'C20', name: opening } : null,
  })),
  opening: opening ? { eco: 'C20', name: opening } : null,
});

/** Lichess's explorer over the board, its config's props reading and setting `state`. */
function explorerOf(ctrl: FakeController, state: FakeExplorer): object {
  return {
    fetchMasterOpening: () => Promise.resolve({}),
    isAuth: () => state.signedIn,
    enabled: () => state.enabled,
    loading: () => false,
    failing: () => state.failing,
    current: () => state.books.get(positionKey(ctrl.node.fen)) ?? null,
    reload: () => {
      state.reloads++;
    },
    config: {
      // Lichess reads 'me' as the signed-in user.
      selectPlayer: (name: string) => {
        state.db = 'player';
        state.player = name === 'me' ? (document.body.dataset.user ?? '') : name;
      },
      data: {
        db: (db?: ExplorerDb) => (db ? (state.db = db) : state.db),
        color: (color?: Color) => (color ? (state.color = color) : state.color),
        rating: (ratings?: number[]) => (ratings ? (state.ratings = ratings) : state.ratings),
        playerName: { value: () => state.player },
      },
    },
    opts: { endpoint: 'https://explorer.lichess.test' },
  };
}

/** The PGN box's moves ("1. e4 e5 2. Nf3") played from the start, the tree's old moves gone. */
function loadPgn(ctrl: FakeController, pgn: string): void {
  const moves = pgn.split(' ').filter(token => token !== '' && !/^\d+\.$/.test(token));
  const line = playLine(moves);
  if (!line) throw new Error(`Not a line: ${pgn}`);
  ctrl.tree.root.children.length = 0;
  ctrl.treeVersion++;
  ctrl.jump('');
  for (const uci of line.ucis) ctrl.playUci(uci);
}

/** The free board at the start, with an explorer open on the masters' games. */
export function practiceBoard(options: { signedIn?: boolean } = {}): PracticeBoard {
  const ctrl = fakeController({
    id: 'synthetic',
    positions: [{ ply: 0, fen: START_FEN }],
    synthetic: true,
  });
  const explorer: FakeExplorer = {
    enabled: true,
    db: 'masters',
    color: 'white',
    player: '',
    ratings: [1600, 1800],
    failing: false,
    signedIn: options.signedIn ?? true,
    books: new Map(),
    reloads: 0,
  };
  const computer: boolean[] = [];
  const controller = explorerOf(ctrl, explorer);
  Object.assign(ctrl, {
    explorer: controller,
    toggleExplorer: () => {
      explorer.enabled = !explorer.enabled;
    },
    flip: () => {
      ctrl.orientation = opposite(ctrl.orientation);
    },
    changePgn: (pgn: string) => loadPgn(ctrl, pgn),
    togglePractice: (on?: boolean) => {
      computer.push(Boolean(on));
      ctrl.practice = on ? {} : undefined;
    },
  });
  withFakeSite(ctrl);
  mountFakePage(ctrl);
  const facade = analysis();
  if (!facade) throw new Error('the fake controller is not a controller');
  const modes: Mode[] = [];
  const session: Session = createSession({
    language: en,
    coach: 1,
    elements: createElements(),
    redraw: () => renderOpenings(session, facade),
    setMode: mode => {
      modes.push(mode);
      session.view.mode = mode;
    },
  });
  session.view.mode = 'openings';
  queryOne(document, 'main.analyse', HTMLElement)?.append(session.elements.panel);
  watchClicks(session);
  return { ctrl, facade, explorer, session, modes, computer };
}

/** The element of the practice page that `selector` finds. */
export function shown(session: Session, selector: string): HTMLElement {
  const element = queryOne(session.elements.panel, selector, HTMLElement);
  if (!element) throw new Error(`Nothing on the page matches ${selector}`);
  return element;
}

/** Clicks the page's element that `selector` finds, as the user would. */
export function clickOn(session: Session, selector: string): void {
  shown(session, selector).click();
}

/** The texts of the page's elements that `selector` finds. */
export const textsIn = (root: ParentNode, selector: string): string[] =>
  queryAll(root, selector, HTMLElement).map(element =>
    element.textContent.replaceAll(/\s+/g, ' ').trim(),
  );

export const textsOf = (session: Session, selector: string): string[] =>
  textsIn(session.elements.panel, selector);

/** What the coach says on the page, every word laid out, typed or not yet. */
export const coachWords = (session: Session): string =>
  textsOf(session, '.ln-ext-bubble__sub .ln-ext-w').join(' ');

/** Plays `moves` on the board, from the position it shows. */
export function playMoves(board: PracticeBoard, moves: readonly string[]): void {
  const before = board.ctrl.nodeList.slice(1).map(node => node.san ?? '');
  const line = playLine([...before, ...moves]);
  if (!line) throw new Error(`Not a line: ${moves.join(' ')}`);
  for (const uci of line.ucis.slice(before.length)) board.ctrl.playUci(uci);
}

/** The reply waits for the engine's verdict this long at most (view/practice-follow.ts). */
export const VERDICT_WAIT_MS = 4000;

/** The page follows the board and draws again, as each of its passes does. */
export function step({ session, facade }: PracticeBoard): void {
  followPractice(session, facade);
  renderOpenings(session, facade);
}

/** Practice as White from the start, the masters answering 1. e4 or 1. d4, then 1… e5 and 2. Nf3. */
export function practicing(): PracticeBoard {
  const board = practiceBoard();
  board.explorer.books.set(
    keyAfter([]),
    answer([
      ['e4', 'e2e4', 600],
      ['d4', 'd2d4', 300],
      ['a4', 'a2a4', 1],
    ]),
  );
  board.explorer.books.set(keyAfter(['e4']), answer([['e5', 'e7e5', 500]]));
  board.explorer.books.set(keyAfter(['e4', 'e5']), answer([['Nf3', 'g1f3', 400]]));
  renderOpenings(board.session, board.facade);
  clickOn(board.session, '[data-ln-ext="practice-start"]');
  step(board);
  return board;
}

/** The practice card's title. */
export const cardTitle = ({ session }: PracticeBoard): string =>
  textsOf(session, '.ln-ext-bubble--practice .ln-ext-bubble__title').join(' ');

/** The buttons under the card. */
export const navButtons = ({ session }: PracticeBoard): string[] =>
  textsOf(session, '.ln-ext-review__nav--practice .ln-ext-btn');

/** The board's moves from the start, in SAN. */
export const boardMoves = ({ ctrl }: PracticeBoard): (string | undefined)[] =>
  ctrl.nodeList.slice(1).map(node => node.san);
