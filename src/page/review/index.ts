import type { Feature } from '#shared/features.ts';
import { pollUntil } from '#shared/poll.ts';
import { GAME_PAGE } from '#page/lichess/pages.ts';
import { createReview, linksToMove, readyAnalysis, startReview } from './start.ts';

// The Game Review on Lichess's analysis pages: a summary of the game, then a
// move-by-move review with a coach, from Lichess's own Stockfish build. On the
// free analysis board, the same coach judges each move as it's played.

const ANALYSIS_BOARD = /^\/analysis(?:\/|$)/;

function start(): void {
  const { pathname } = location;
  if (!GAME_PAGE.test(pathname) && !ANALYSIS_BOARD.test(pathname)) return;
  const onMove = linksToMove();
  // Lichess builds its analysis controller after our script starts.
  pollUntil(readyAnalysis, analysis => startReview(createReview(analysis), analysis, onMove), {
    intervalMs: 100,
    giveUpMs: 30_000,
  });
}

export const review: Feature = { name: 'game review', start };
