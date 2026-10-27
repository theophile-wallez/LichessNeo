import { coachOptions, speakingCoach } from '#shared/coach.ts';
import { onCoachOptions } from '#shared/protocol.ts';
import { PRACTICE_HASH } from '#shared/practice-page.ts';
import { analysis as pageAnalysis, type Analysis } from '#page/lichess/analysis.ts';
import { onJump } from '#page/lichess/jumps.ts';
import { analyseGame } from './game/analyse-game.ts';
import { pageLanguage } from './i18n/language.ts';
import { createSession, type Mode, type Session } from './session.ts';
import { watchChips } from './view/chips.ts';
import { watchClicks } from './view/clicks.ts';
import { watchCoachPicks } from './view/coach-avatar.ts';
import { createElements } from './view/elements.ts';
import { keepMarked, render, renderJump, setMode } from './view/render.ts';
import { isConsentReturn } from './practice/sync-connect.ts';
import { canPractice, lastMover, startPractice } from './view/practice.ts';
import { finishConsent } from './view/openings-sync.ts';
import { refitStream } from './view/stream.ts';
import { watchCostTips } from './view/cost-tip.ts';
import { watchTips } from './view/tooltip.ts';
import { switchOff, switchOn } from './view/switch-off.ts';
import { REVIEWED_VARIANTS } from './variants.ts';

// Starts the review once Lichess's analysis controller is up: on a game's
// analysis, the review of its moves; on the free analysis board, the coach,
// unless the settings leave that board to Lichess's own panel.

// The panel looks again this often, for what changes on its own (the analysis,
// the engines); a move of the board draws it in the next frame (onJump).
const RENDER_MS = 150;
// A link to one of the game's moves (/game/<id>#46), which Lichess opens on that
// move: the review opens on the coach there rather than on the summary.
// Lichess drops the hash once read, so it's read as our script starts.
const MOVE_LINK = /^#\d+$/;

/** The page was opened from a link to one of the game's moves. */
export const linksToMove = (): boolean => MOVE_LINK.test(location.hash);
// The practice page's address: the sidebar links to it, and an opening's page to
// its line on it (content/pages/opening-practice.ts). Lichess's consent page
// comes back to it without its hash.
const consentReturn = isConsentReturn();
const linksToPractice = location.hash === PRACTICE_HASH || consentReturn;
// A resize under this (a scrollbar coming and going) keeps the comment as it is.
const RESIZE_SLACK = 4;

/** The review of the page's game, the coach speaking to the user of their own moves. */
export function createReview(analysis: Analysis): Session {
  const session: Session = createSession({
    language: pageLanguage(analysis.viewerColor()),
    coach: speakingCoach(),
    elements: createElements(),
    redraw: force => render(session, force),
    setMode: mode => setMode(session, mode),
  });
  watchClicks(session);
  watchCoachPicks(session);
  watchChips(session);
  watchTips(session);
  watchCostTips(session);
  return session;
}

// Called only for a page the review covers. Rendering on any other page (a
// variant, a game without moves) would show an empty panel.
function run(session: Session, mode: Mode): void {
  setMode(session, mode);
  keepMarked(session);
  setInterval(() => render(session), RENDER_MS);
  onJump(() => renderJump(session));
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

// The settings' switch, flipped while the board is open: practice stays, as its address opened it.
function followAnalysisCoach(session: Session, started: boolean): void {
  let running = started;
  onCoachOptions(({ analysis }) => {
    if (session.view.mode === 'openings') return;
    if (!analysis) {
      if (running) switchOff(session);
    } else if (running) switchOn(session);
    else {
      running = true;
      run(session, 'live');
    }
  });
}

/**
 * The free board: its coach, unless the settings leave it to Lichess's panel,
 * or the practice page, which its address opens whatever they say.
 */
function startFreeBoard(session: Session, analysis: Analysis): void {
  // The sidebar's link, followed from the free board itself, only changes the hash.
  window.addEventListener('hashchange', () => {
    if (location.hash !== PRACTICE_HASH || session.view.mode === 'openings') return;
    if (session.view.drawnMode === null) location.reload();
    else {
      session.view.switchedOff = false;
      session.setMode('openings');
    }
  });
  if (!linksToPractice) {
    const started = coachOptions().analysis;
    if (started) run(session, 'live');
    followAnalysisCoach(session, started);
    return;
  }
  run(session, 'openings');
  if (consentReturn) finishConsent(session);
  // An opening's line: its last move is the opening's own, and the user practices its side.
  if (analysis.node.ply > 0 && canPractice(analysis))
    startPractice(session, analysis, { side: lastMover(analysis) });
}

/** Starts the review; `onMove`, the page was opened on one of the game's moves. */
export function startReview(session: Session, analysis: Analysis, onMove = false): void {
  if (!REVIEWED_VARIANTS.has(analysis.data?.game.variant.key ?? '')) return;
  if (analysis.synthetic) {
    startFreeBoard(session, analysis);
    return;
  }
  if (!analysis.gameId || analysis.mainline.length < 2) return;
  run(session, onMove ? 'moves' : 'summary');
  analyseGame(session, analysis).catch((error: unknown) => {
    console.error('[LichessNeo] game analysis failed', error);
  });
}

/** The page's controller once it has a game tree and a board, or null for now. */
export function readyAnalysis(): Analysis | null {
  const analysis = pageAnalysis();
  const board = document.querySelector('main.analyse .analyse__board');
  return analysis?.hasMainline && board ? analysis : null;
}
