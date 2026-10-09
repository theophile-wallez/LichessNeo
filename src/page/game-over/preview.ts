import { opposite, type Color } from '#shared/chess/types.ts';
import { wrapOrientation } from '#shared/chessground.ts';
import { pickCoach } from '#shared/coach.ts';
import { queryOne } from '#shared/dom.ts';
import { opponentName } from './board.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { fetchFinishedGame, parseFinishedGame, type FinishedGame } from './game-data.ts';
import { readOutcome, type Outcome, type Result } from './outcome.ts';
import type { PlayerSummary } from './quick-review.ts';
import { gameOverTexts } from './texts.ts';
import { mountGameOver } from './view.ts';

// A dev build's way to see the game over at will, with sample figures and no
// engine: on a game page, or a finished game's analysis board (where its page
// lands once reloaded), Alt+Shift+E shows it as the game really ended for the
// board's bottom side (a win while it goes on), then each other result at each
// press; `?lr-ext-end=win` (or loss, draw) shows it as the page opens. The card
// shows on a game page only, where Lichess's follow-up buttons are.

const PARAM = 'lr-ext-end';
const RESULTS: readonly Result[] = ['win', 'loss', 'draw'];
const NEXT: Readonly<Record<Result, Result>> = { win: 'loss', loss: 'draw', draw: 'win' };
const WATCH_MS = 250;
/** How long the counts spin before the sample figures come. */
const SAMPLE_MS = 900;
const SAMPLE: PlayerSummary = {
  accuracy: 85.3,
  counts: { best: 9, excellent: 2, mistake: 1 },
  firstPlies: { best: 9, excellent: 15, mistake: 21 },
};

/** The result `?lr-ext-end=` asks for, or null. */
export function previewResult(search: string): Result | null {
  const asked = new URLSearchParams(search).get(PARAM);
  return RESULTS.find(result => result === asked) ?? null;
}

function previewOutcome(result: Result, player: Color): Outcome {
  if (result === 'draw') return { result, reason: 'draw', winner: null };
  return { result, reason: 'resign', winner: result === 'win' ? player : opposite(player) };
}

interface Board {
  readonly main: HTMLElement;
  readonly gameId: string;
  /** The side at the board's bottom, whose game over it shows. */
  readonly player: Color;
}

function boardOnPage(): Board | null {
  const main = queryOne(document, 'main:is(.round, .analyse)', HTMLElement);
  const wrap =
    main && queryOne(main, ':is(.round__app__board, .analyse__board) .cg-wrap', HTMLElement);
  // A game's id is the path's first eight letters, a player's link adding four.
  const gameId = location.pathname.split('/')[1]?.slice(0, 8) ?? '';
  if (!main || !wrap || gameId.length !== 8 || !main.querySelector('cg-board piece.king'))
    return null;
  return { main, gameId, player: wrapOrientation(wrap) };
}

// A finished game's analysis board carries the game in its own data; a game page asks for it.
let onPage: FinishedGame | null = null;

/** How the game on the page really ended, for its bottom side; null while it goes on. */
async function realOutcome({ gameId, player }: Board): Promise<Outcome | null> {
  const finished = onPage ?? (await fetchFinishedGame(gameId, () => true));
  if (!finished) return null;
  return readOutcome({ status: finished.game.status.name, winner: finished.game.winner, player });
}

function show({ main, player }: Board, outcome: Outcome): void {
  const texts = gameOverTexts();
  const view = mountGameOver({
    main,
    outcome,
    texts,
    coachId: pickCoach(),
    opponent: opponentName(main, player, texts.anonymous),
  });
  view.analysing();
  setTimeout(() => view.verdict(SAMPLE), SAMPLE_MS);
}

export function startPreview(): void {
  readPageInitData(text => {
    onPage = parseFinishedGame(text);
  });
  let last: Result | null = null;
  // The game's own result first, then each of the others in turn.
  const next = async (board: Board): Promise<Outcome> => {
    if (last) return previewOutcome(NEXT[last], board.player);
    return (await realOutcome(board)) ?? previewOutcome('win', board.player);
  };
  const press = async (): Promise<void> => {
    const board = boardOnPage();
    if (!board) return;
    const outcome = await next(board);
    last = outcome.result;
    show(board, outcome);
  };
  document.addEventListener('keydown', event => {
    if (!event.altKey || !event.shiftKey || event.code !== 'KeyE') return;
    event.preventDefault();
    void press();
  });
  const asked = previewResult(location.search);
  if (!asked) return;
  const timer = setInterval(() => {
    const board = boardOnPage();
    if (!board) return;
    clearInterval(timer);
    last = asked;
    show(board, previewOutcome(asked, board.player));
  }, WATCH_MS);
}
