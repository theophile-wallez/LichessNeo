import { queryOne, setData, setStyleProperty } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { nonEmpty } from '#shared/text.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import {
  formatSpent,
  GameExportSchema,
  spentTimes,
  type Clock,
  type GameExport,
} from './clock-times.ts';
import { gameIdFrom } from './game-id.ts';

// Move times, once a game is over: the time spent on each move, with a bar
// scaled to the longest think (styles/game/game-over.css). The move list is
// snabbdom's: we only add attributes, and put them back whenever it re-renders.

// Right after the game ends, the export can fail or lag the last move: we
// try again, a second apart.
const MAX_TRIES = 5;
const RETRY_MS = 1000;

export interface FinishedGame {
  readonly id: string;
  readonly clock: Clock;
}

export interface MoveTimes {
  readonly sync: () => void;
  /** The game shown, once its export came back with a clock. */
  readonly finishedGame: () => FinishedGame | null;
}

async function fetchExport(id: string): Promise<GameExport | null> {
  try {
    const url = `/game/export/${id}?moves=false&clocks=true&evals=false&opening=false`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    const result = GameExportSchema.safeParse(body);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// TV shows its games at /tv/<channel>, so the path has no game id. Once a game
// is over, the analysis button links to the game.
function currentGameId(): string | null {
  const link = document.querySelector('main.round :is(i5d, rm6) a.analysis')?.getAttribute('href');
  return gameIdFrom(nonEmpty(link) ?? location.pathname);
}

// The list starts with a move number, and the moves use the other tag.
function moveElements(list: HTMLElement, result: HTMLElement): HTMLElement[] {
  const indexTag = list.firstElementChild?.tagName;
  return [...list.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.tagName !== indexTag &&
      child !== result &&
      !child.classList.contains('empty'),
  );
}

function showTimes(moves: readonly HTMLElement[], spent: readonly number[]): void {
  const longest = Math.max(...spent) || 1;
  for (const [i, move] of moves.entries()) {
    const time = spent[i];
    if (time === undefined) continue;
    setData(move, 'lrExtTime', formatSpent(time));
    setStyleProperty(move, '--lr-ext-time', (time / longest).toFixed(3));
  }
}

interface GameTimes {
  readonly id: string;
  spent: number[] | null;
  clock: Clock | null;
  tries: number;
  loading: boolean;
  /** When the last request ended. */
  at: number;
}

const newGameTimes = (id: string): GameTimes => ({
  id,
  spent: null,
  clock: null,
  tries: 0,
  loading: false,
  at: 0,
});

// What the times were last drawn on: while it holds, there's nothing to redo.
interface Drawn {
  readonly list: HTMLElement;
  readonly count: number;
  readonly lastMove: HTMLElement | null;
  readonly spent: readonly number[] | null;
}

const sameDrawn = (drawn: Drawn, previous: Drawn | null): boolean =>
  previous !== null &&
  drawn.list === previous.list &&
  drawn.count === previous.count &&
  drawn.lastMove === previous.lastMove &&
  drawn.spent === previous.spent &&
  // snabbdom may have put back a move without our attributes.
  drawn.lastMove?.dataset.lrExtTime !== undefined;

// Into the game it was asked for, which may no longer be the one shown.
async function loadTimes(times: GameTimes): Promise<void> {
  times.loading = true;
  const data = await fetchExport(times.id);
  if (data) {
    times.clock = data.clock ?? null;
    times.spent = spentTimes(data);
  }
  times.loading = false;
  times.at = Date.now();
}

// A game without a clock has no times: nothing to wait for.
const lacksTimes = (times: GameTimes, moveCount: number): boolean =>
  !times.spent || (times.clock !== null && times.spent.length < moveCount);

function retryWhenDue(times: GameTimes): void {
  if (times.loading || times.tries >= MAX_TRIES || Date.now() - times.at <= RETRY_MS) return;
  times.tries++;
  void loadTimes(times);
}

export function createMoveTimes(): MoveTimes {
  let game = newGameTimes('');
  let drawn: Drawn | null = null;

  function sync(): void {
    const result = queryOne(document, 'main.round .result-wrap', HTMLElement);
    const list = result?.parentElement;
    const id = list ? currentGameId() : null;
    if (!result || !list || id === null) return;
    if (game.id !== id) game = newGameTimes(id);
    const moves = moveElements(list, result);
    const lastMove = moves.at(-1) ?? null;
    const shape: Drawn = { list, count: moves.length, lastMove, spent: game.spent };
    if (sameDrawn(shape, drawn)) return;
    const missing = lacksTimes(game, moves.length);
    if (missing) retryWhenDue(game);
    if (!game.spent || game.spent.length === 0) return;
    showTimes(moves, game.spent);
    setData(list, 'lrExtTimes', '');
    // Lagging times are drawn again as each retry comes back.
    drawn = missing && game.tries < MAX_TRIES ? null : shape;
  }

  const finishedGame = (): FinishedGame | null =>
    game.clock ? { id: game.id, clock: game.clock } : null;

  return { sync, finishedGame };
}

const tracker = createMoveTimes();

/** The game shown, once its export came back with a clock (for the New game button). */
export const finishedGame = (): FinishedGame | null => tracker.finishedGame();

export const moveTimes: Feature = {
  name: 'move times',
  start: () => onEveryTick('move times', tracker.sync),
};
