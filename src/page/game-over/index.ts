import { DEV_BUILD } from '#shared/build-mode.ts';
import { speakingCoach } from '#shared/coach.ts';
import { isParsing, queryOne } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { gameIdFrom } from '#shared/game-path.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { playedGame, type PlayedGame } from '#shared/round-init.ts';
import type { Stockfish } from '#page/review/engine/stockfish.ts';
import { bootEngine } from '#page/review/engine-pool.ts';
import { fetchExport } from '#page/review/game/export.ts';
import { afterBoardWave } from './after-wave.ts';
import { opponentName } from './board.ts';
import { fetchFinishedGame, type FinishedGame, roundFinishedGame } from './game-data.ts';
import { playEndAnimation, shownResult } from './end-animation.ts';
import { finalMate } from './mate.ts';
import { type Outcome, readOutcome } from './outcome.ts';
import { precomputeReview, worthReviewing } from './precompute.ts';
import { startPreview } from './preview.ts';
import { type PlayerSummary, quickReview, quickSearch, summarize } from './quick-review.ts';
import { gameOverTexts } from './texts.ts';
import { mountGameOver } from './view.ts';

// The end of a game the player watches end: the kings' badges, the end's
// animation the settings pick (confetti or the board's wave, after the results they pick), and
// a card in the right-hand panel where the coach counts the player's best
// moves and errors before sending them to Game Review, whose
// analysis then runs here, so the review is ready when opened, and its
// figures replace the count's. A player's game opened once over gets it too,
// without the animation, and at once. A dev build can show it at will (preview.ts).

async function bookPly(gameId: string, positions: number): Promise<number> {
  try {
    return (await fetchExport(gameId, positions))?.bookPly ?? 0;
  } catch {
    return 0;
  }
}

interface QuickLook {
  readonly summary: PlayerSummary;
  /** The engine it ran on, for the review's analysis to take over. */
  readonly engine: Stockfish;
}

/** The coach's count, at a low depth; null when it failed. */
async function quickLook(game: PlayedGame, finished: FinishedGame): Promise<QuickLook | null> {
  const positions = finished.treeParts;
  const chess960 = finished.game.variant.key === 'chess960';
  let engine: Stockfish | null = null;
  try {
    const [booted, book] = await Promise.all([
      afterBoardWave().then(() => bootEngine(chess960)),
      bookPly(game.gameId, positions.length),
    ]);
    engine = booted;
    const analyse = quickSearch(booted);
    const summary = await quickReview({
      positions,
      color: game.color,
      bookPly: book,
      chess960,
      analyse,
    });
    return { summary, engine: booted };
  } catch (error) {
    console.warn('[LichessNeo] game over analysis', error);
    engine?.quit();
    return null;
  }
}

/** The game's page still shows it over: not another game, nor the same page gone. */
const showsOver = (main: HTMLElement, gameId: string): boolean =>
  main.isConnected &&
  main.querySelector('.result-wrap') !== null &&
  gameIdFrom(location.pathname) === gameId;

interface Ended {
  readonly finished: FinishedGame;
  readonly outcome: Outcome;
}

/**
 * The game as it ended, for its player. A game opened once over brings all of
 * it in the page's own data (`opened`), so the card comes in at once; one that
 * ends as it's watched waits for its finished page.
 */
async function endOf(game: PlayedGame, opened: FinishedGame | null): Promise<Ended | null> {
  const outcomeOf = (finished: FinishedGame): Outcome | null =>
    readOutcome({
      status: finished.game.status.name,
      winner: finished.game.winner,
      player: game.color,
    });
  const isOver = (data: FinishedGame): boolean => outcomeOf(data) !== null;
  const finished = opened && isOver(opened) ? opened : await fetchFinishedGame(game.gameId, isOver);
  const outcome = finished && outcomeOf(finished);
  return finished && outcome ? { finished, outcome } : null;
}

export async function onGameEnd(
  game: PlayedGame,
  main: HTMLElement,
  opened: FinishedGame | null = null,
): Promise<void> {
  const ended = await endOf(game, opened);
  if (!ended || !main.isConnected) return;
  const { finished, outcome } = ended;
  const texts = gameOverTexts();
  const view = mountGameOver({
    main,
    outcome,
    texts,
    coachId: speakingCoach(),
    opponent: opponentName(main, game.color, texts.anonymous),
    mate: outcome.reason === 'mate' ? finalMate(finished) : null,
  });
  const positions = finished.treeParts;
  if (!worthReviewing(finished.game.variant.key, positions.length)) {
    view.verdict(null);
    return;
  }
  view.analysing();
  const look = await quickLook(game, finished);
  if (look) view.verdict(look.summary);
  // Then Game Review's own analysis, for when the player opens it; the card
  // takes its figures, so both say the same. Without the quick look (the
  // engine too slow on a busy machine), the card waits for them.
  const summary = await reviewSummary(game, finished, {
    engine: look?.engine,
    stillOver: () => showsOver(main, game.gameId),
  });
  if (look && summary) view.refine(summary);
  else if (!look) {
    if (summary) view.verdict(summary);
    else view.failed();
  }
}

interface ReviewRun {
  /** The quick look's engine, if it ran. */
  readonly engine: Stockfish | undefined;
  readonly stillOver: () => boolean;
}

/** The player's figures from Game Review's analysis, run here; null if it didn't finish. */
async function reviewSummary(
  game: PlayedGame,
  finished: FinishedGame,
  { engine, stillOver }: ReviewRun,
): Promise<PlayerSummary | null> {
  const positions = finished.treeParts;
  const variant = finished.game.variant.key;
  const records = await precomputeReview({
    gameId: game.gameId,
    positions,
    variant,
    engine,
    stillOver,
  });
  if (!records) return null;
  // Asked again: right after the game, the export may not know its opening yet.
  const book = await bookPly(game.gameId, positions.length);
  const chess960 = variant === 'chess960';
  return summarize({ positions, records, color: game.color, bookPly: book, chess960 });
}

/** Plays the game's end once its result shows; false while it doesn't. */
function endIfShown(game: PlayedGame, opened: FinishedGame | null): boolean {
  const main = queryOne(document, 'main.round', HTMLElement);
  if (!main?.querySelector('.result-wrap')) return false;
  // Watched as it ended, its animation plays off the score at once, before the finished game comes.
  const result = opened ? null : shownResult(main, game.color);
  if (result) playEndAnimation({ main, result });
  void onGameEnd(game, main, opened);
  return true;
}

/**
 * Waits for the game's result to show, then plays its end once, in the frame
 * Lichess draws it: a game opened once over gets its card with the buttons,
 * one watched as it ends its animation with the mating move.
 */
function watchEnd(game: PlayedGame, opened: FinishedGame | null): void {
  const observer = new MutationObserver(() => {
    if (endIfShown(game, opened)) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export const gameOver: Feature = {
  name: 'game over',
  start: () => {
    if (DEV_BUILD) startPreview();
    // Lichess removes its init data once read: only a script running while
    // the page parses sees it.
    if (!isParsing()) return;
    readPageInitData(text => {
      const game = playedGame(text);
      if (game) watchEnd(game, game.live ? null : roundFinishedGame(text));
    });
  },
};
