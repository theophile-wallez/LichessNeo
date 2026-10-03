import { pickCoach } from '#shared/coach.ts';
import { analysis as pageAnalysis, type Analysis } from '#page/lichess/analysis.ts';
import { analyseGame } from './game/analyse-game.ts';
import { pageLanguage } from './i18n/language.ts';
import { createSession, type Mode, type Session } from './session.ts';
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
// A resize under this (a scrollbar coming and going) keeps the comment as it is.
const RESIZE_SLACK = 4;

export function createReview(): Session {
  const session: Session = createSession({
    language: pageLanguage(),
    coach: pickCoach(),
    elements: createElements(),
    redraw: force => render(session, force),
    setMode: mode => setMode(session, mode),
  });
  watchClicks(session);
  watchTips(session);
  watchCostTips(session);
  return session;
}

// Called only for a page the review covers. Rendering on any other page (a
// variant, a game without moves) would show an empty panel.
function run(session: Session, mode: Mode): void {
  document.documentElement.classList.toggle('cdc-review', true);
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
  // Draw again on leaving the mobile layout. The panel was hidden there, so the
  // graph and the comment were laid out at zero size.
  session.wide.addEventListener('change', refit);
}

export function startReview(session: Session, analysis: Analysis): void {
  if (!REVIEWED_VARIANTS.has(analysis.data?.game.variant.key ?? '')) return;
  if (analysis.synthetic) {
    run(session, 'live');
    return;
  }
  if (!analysis.gameId || analysis.mainline.length < 2) return;
  run(session, 'summary');
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
