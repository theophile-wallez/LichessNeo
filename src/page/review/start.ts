import { pickCoach } from '#shared/coach.ts';
import { analysis as pageAnalysis, type Analysis } from '#page/lichess/analysis.ts';
import { analyseGame } from './game/analyse-game.ts';
import { pageLanguage } from './i18n/language.ts';
import { createSession, type Mode, type Session } from './session.ts';
import { watchChips } from './view/chips.ts';
import { watchClicks } from './view/clicks.ts';
import { createElements } from './view/elements.ts';
import { render, setMode } from './view/render.ts';
import { refitStream } from './view/stream.ts';
import { watchCostTips } from './view/cost-tip.ts';
import { watchTips } from './view/tooltip.ts';
import { REVIEWED_VARIANTS } from './variants.ts';

// Starts the review once Lichess's analysis controller is up: on a game's
// analysis, the review of its moves; on the free analysis board, the coach.

const RENDER_MS = 150;
// A link to one of the game's moves (/<id>#46), which Lichess opens on that
// move: the review opens on the coach there rather than on the summary.
// Lichess drops the hash once read, so it's read as our script starts.
const MOVE_LINK = /^#\d+$/;

/** The page was opened from a link to one of the game's moves. */
export const linksToMove = (): boolean => MOVE_LINK.test(location.hash);
// A resize under this (a scrollbar coming and going) keeps the comment as it is.
const RESIZE_SLACK = 4;

/** The review of the page's game, the coach speaking to the user of their own moves. */
export function createReview(analysis: Analysis): Session {
  const session: Session = createSession({
    language: pageLanguage(analysis.viewerColor()),
    coach: pickCoach(),
    elements: createElements(),
    redraw: force => render(session, force),
    setMode: mode => setMode(session, mode),
  });
  watchClicks(session);
  watchChips(session);
  watchTips(session);
  watchCostTips(session);
  return session;
}

// Called only for a page the review covers. Rendering on any other page (a
// variant, a game without moves) would show an empty panel.
function run(session: Session, mode: Mode): void {
  setMode(session, mode);
  setInterval(() => render(session), RENDER_MS);
  let lastWidth = window.innerWidth;
  const refit = (): void => {
    lastWidth = window.innerWidth;
    refitStream(session);
    render(session, true);
  };
  window.addEventListener('resize', () => {
    if (Math.abs(window.innerWidth - lastWidth) > RESIZE_SLACK) refit();
  });
  // Draw again on crossing 1020px: the panel moves between the board's side and
  // the column under it, so the graph and the comment are laid out anew.
  session.wide.addEventListener('change', refit);
}

/** Starts the review; `onMove`, the page was opened on one of the game's moves. */
export function startReview(session: Session, analysis: Analysis, onMove = false): void {
  if (!REVIEWED_VARIANTS.has(analysis.data?.game.variant.key ?? '')) return;
  if (analysis.synthetic) {
    run(session, 'live');
    return;
  }
  if (!analysis.gameId || analysis.mainline.length < 2) return;
  run(session, onMove ? 'moves' : 'summary');
  analyseGame(session, analysis).catch((error: unknown) => {
    console.error('[LichessReimagined] game analysis failed', error);
  });
}

/** The page's controller once it has a game tree and a board, or null for now. */
export function readyAnalysis(): Analysis | null {
  const analysis = pageAnalysis();
  const board = document.querySelector('main.analyse .analyse__board');
  return analysis?.hasMainline && board ? analysis : null;
}
