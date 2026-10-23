import { fenTurn } from '#shared/chess/fen.ts';
import { type Color, opposite } from '#shared/chess/types.ts';
import type { Analysis } from '#page/lichess/analysis.ts';
import { judgeAt } from '#page/review/live/judging.ts';
import {
  type Aims,
  depthFor,
  moveKey,
  type OwnBook,
  type PracticeState,
} from '#page/review/practice/state.ts';
import { takeBackPath } from '#page/review/practice/status.ts';
import { type LossAt, targetAt } from '#page/review/practice/verdict.ts';
import type { Session } from '#page/review/session.ts';
import { goTo } from './navigation.ts';
import { writeSync } from './openings-sync.ts';
import { applyLevel, restoreLevel } from './practice-level.ts';
import { noteMiss } from './practice-progress.ts';
import { HINTS } from './retry-hint.ts';

// Opening practice on the free board: the user plays a side, and the other
// side's moves come from a book, each played as often as its games play it,
// until the book ends. The book is the opening explorer's games, in the
// database its tabs pick, which Lichess looks up as the board reaches each
// position; or one of the line's own (a study, the user's repertoire, a trap).
// A move practice doesn't take is taken back for another try, as a retry's
// miss is (view/practice-follow.ts).

/** The engine's verdicts on the board's moves, for practice to take a dubious one back. */
export const lossesOf =
  (session: Session, analysis: Analysis): LossAt =>
  path =>
    judgeAt(session.live, analysis, path)?.loss ?? null;

/** The free board's practice is possible: an explorer that answers, a board that plays moves. */
export const canPractice = (analysis: Analysis): boolean =>
  analysis.synthetic && analysis.canPlayUci && Boolean(analysis.explorer?.signedIn);

/** How a line starts: the side the user plays (the board's bottom), its opening, its own book. */
export interface LineStart {
  readonly side?: Color | undefined;
  readonly opening?: string | undefined;
  readonly own?: OwnBook | null | undefined;
  readonly aims?: Aims | null | undefined;
  readonly length?: number | null | undefined;
}

/** A line's state, fresh from the board's position. */
function freshState(
  session: Session,
  analysis: Analysis,
  { start, side, explorerWas }: { start: LineStart; side: Color; explorerWas: boolean },
): PracticeState {
  return {
    start: analysis.path,
    side,
    opening: start.opening ?? '',
    books: new Map(),
    source: analysis.explorer?.source ?? null,
    own: start.own ?? null,
    aims: start.aims ?? null,
    length: start.length ?? null,
    depth: depthFor(start.opening ?? ''),
    grew: null,
    explorerWas,
    waiting: null,
    hints: 0,
    hintsAt: '',
    hinted: new Set(),
    miss: null,
    misses: 0,
    refused: null,
    deviated: null,
    revealed: new Set(),
    settings: session.view.openings.settings,
    met: new Set(),
    // A round's cards carry the streak on.
    streak: session.view.practice?.streak ?? 0,
    bestStreak: 0,
    scored: new Set(),
    missedAt: new Set(),
    cheers: new Map(),
    ended: null,
    at: analysis.path,
    // A line that ends on the user's move waits for the book's reply.
    forward: true,
  };
}

/** Starts practice from the board's position. */
export function startPractice(session: Session, analysis: Analysis, start: LineStart = {}): void {
  const { explorer } = analysis;
  if (!explorer) return;
  // A round's next card leaves the explorer as the user had it before the round.
  const explorerWas = session.view.practice?.explorerWas ?? explorer.enabled;
  // Lichess's own practice plays the computer's moves: one opponent at a time.
  analysis.stopPractice();
  // The explorer's book looks positions up only while it's open; a book of its own needs none.
  if (explorer.enabled === Boolean(start.own)) analysis.toggleExplorer();
  const side = start.side ?? analysis.orientation();
  if (side !== analysis.orientation()) analysis.flip();
  followSide(analysis, side);
  // The page's choices keep it for the next line.
  session.view.openings.side = side;
  if (!start.own) applyLevel(session, analysis);
  session.view.practice = freshState(session, analysis, { start, side, explorerWas });
}

export function stopPractice(session: Session, analysis: Analysis): void {
  const { practice } = session.view;
  session.view.practice = null;
  session.view.round = null;
  writeSync();
  restoreLevel(analysis);
  const { explorer } = analysis;
  if (practice && explorer && explorer.enabled !== practice.explorerWas) analysis.toggleExplorer();
}

/** Plays the other side: the board turns, and the book replies if it's its turn now. */
export function switchSide(session: Session, analysis: Analysis): void {
  const { practice } = session.view;
  if (!practice) return;
  practice.side = opposite(practice.side);
  session.view.openings.side = practice.side;
  analysis.flip();
  followSide(analysis, practice.side);
}

/** The user's own games are read as the side they play: their replies are the opponents'. */
export function followSide(analysis: Analysis, side: Color): void {
  const { explorer } = analysis;
  const source = explorer?.source;
  if (source?.db === 'player' && source.color !== side) explorer?.selectBook('player', side);
}

/** Back to the user's turn: a move that wasn't their own counts as missed. */
export function takeBack(session: Session, analysis: Analysis): void {
  const { practice } = session.view;
  if (!practice) return;
  const back = takeBackPath(practice, analysis);
  if (practice.deviated === analysis.path) noteMiss(session, analysis, back);
  goTo(analysis, back);
}

/** Back to where practice started, for another line: the replies are drawn again. */
export function practiceAgain(session: Session, analysis: Analysis): void {
  const { practice } = session.view;
  if (!practice) return;
  practice.miss = null;
  practice.misses = 0;
  practice.revealed.clear();
  // A round of its own: its moves count again, and the book's replies met stay met.
  practice.scored.clear();
  practice.missedAt.clear();
  practice.hinted.clear();
  goTo(analysis, practice.start);
}

/** Hands the board over to Lichess's practice against the computer, from where it stands. */
export function playComputer(session: Session, analysis: Analysis): void {
  stopPractice(session, analysis);
  session.setMode('live');
  analysis.startComputerPractice();
}

/** The next hint on the user's move: the piece the move to find moves, then its square. */
export function askPracticeHint(session: Session, analysis: Analysis): void {
  const { practice } = session.view;
  if (!practice) return;
  if (practice.hintsAt !== analysis.path) practice.hints = 0;
  practice.hintsAt = analysis.path;
  practice.hints = Math.min(practice.hints + 1, HINTS);
  practice.hinted.add(analysis.path);
}

/** Hints asked for on the position on the board. */
export const practiceHints = (session: Session, analysis: Analysis): number => {
  const { practice } = session.view;
  return practice?.hintsAt === analysis.path ? practice.hints : 0;
};

/** Plays the move to find in the user's place: the answer, after a miss or the hints. */
export function revealPracticeMove(session: Session, analysis: Analysis): void {
  const { practice } = session.view;
  const target = practice ? targetAt(practice, analysis, analysis.path) : null;
  if (!practice || !target) return;
  noteMiss(session, analysis, analysis.path);
  practice.revealed.add(moveKey(analysis.path, target.san));
  analysis.playUci(target.uci);
  analysis.redraw();
}

/** The side whose move led to the board's position: who chose the line, from an opening's page. */
export const lastMover = (analysis: Analysis): Color => opposite(fenTurn(analysis.node.fen));
