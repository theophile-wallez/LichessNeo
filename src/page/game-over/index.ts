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
import { opponentName } from './board.ts';
import { fetchFinishedGame, type FinishedGame } from './game-data.ts';
import { finalMate } from './mate.ts';
import { readOutcome } from './outcome.ts';
import { precomputeReview, worthReviewing } from './precompute.ts';
import { startPreview } from './preview.ts';
import { type PlayerSummary, quickReview, quickSearch, summarize } from './quick-review.ts';
import { gameOverTexts } from './texts.ts';
import { mountGameOver } from './view.ts';

// The end of a game the player watches end: the kings' badges, confetti for
// the winner, and a card in the right-hand panel where the coach counts the
// player's best moves and errors before sending them to Game Review, whose
// analysis then runs here, so the review is ready when opened, and its
// figures replace the count's. A player's game opened once over gets it too,
// without the confetti. A dev build can show it at will (preview.ts).

const WATCH_MS = 250;

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
      bootEngine(chess960),
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

export async function onGameEnd(game: PlayedGame, main: HTMLElement): Promise<void> {
  const outcomeOf = (finished: FinishedGame): ReturnType<typeof readOutcome> =>
    readOutcome({
      status: finished.game.status.name,
      winner: finished.game.winner,
      player: game.color,
    });
  const finished = await fetchFinishedGame(game.gameId, data => outcomeOf(data) !== null);
  const outcome = finished && outcomeOf(finished);
  if (!finished || !outcome || !main.isConnected) return;
  const texts = gameOverTexts();
  const view = mountGameOver({
    main,
    outcome,
    texts,
    coachId: speakingCoach(),
    opponent: opponentName(main, game.color, texts.anonymous),
    live: game.live,
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

/** Waits for the game's result to show, then plays its end once. */
function watchEnd(game: PlayedGame): void {
  const timer = setInterval(() => {
    const main = queryOne(document, 'main.round', HTMLElement);
    if (!main?.querySelector('.result-wrap')) return;
    clearInterval(timer);
    void onGameEnd(game, main);
  }, WATCH_MS);
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
      if (game) watchEnd(game);
    });
  },
};
