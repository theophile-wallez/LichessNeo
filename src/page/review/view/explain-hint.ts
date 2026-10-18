import { lineMoves } from '#page/review/chess/line.ts';
import type { CommentPart } from '#page/review/comment/markup.ts';
import { lineToken, moveToken } from '#page/review/comment/tokens.ts';
import {
  BEST_PLIES,
  bestRequest,
  explainLines,
  PUNISHMENT_PLIES,
} from '#page/review/explain/lines.ts';
import type { JudgedMove, Session } from '#page/review/session.ts';
import { openingOf } from './verdict.ts';

// What Explain says in place of the coach's comment: a book move's opening,
// or the engine's lines around a move that wasn't best. Each move of a line
// plays the line up to itself (view/chips.ts).

const say = (text: string, droppable = false): CommentPart => ({ text, droppable });

interface Written {
  /** The line's position: before the move ('b') or after it ('a'). */
  readonly base: 'b' | 'a';
  readonly fen: string;
  readonly line: readonly string[];
  readonly plies: number;
}

/** A line written from its position, cut to `plies`, each move playable. */
function written({ base, fen, line, plies }: Written): string {
  const ucis = line.slice(0, plies);
  return lineToken(lineMoves(fen, ucis), { base, ucis });
}

function linesHint(session: Session, move: JudgedMove): CommentPart[] {
  const { ui } = session.language;
  const lines = explainLines(session, move);
  // Until the engine has played the lines out, and when the best is one move long, the move alone.
  const best = lines && lines.best.length > 1 ? lines.best : null;
  const fen = move.previousPosition.fen;
  const bestPart = best
    ? ui.lines.best(written({ base: 'b', fen, line: best, plies: BEST_PLIES }))
    : ui.bestWas(
        moveToken(move.bestSan, move.color, { base: 'b', ucis: move.best ? [move.best] : [] }),
      );
  const punishment = lines?.punishment;
  if (!punishment) return [say(bestPart)];
  const line = written({
    base: 'a',
    fen: move.position.fen,
    line: punishment,
    plies: PUNISHMENT_PLIES,
  });
  const played = moveToken(move.san, move.color, { base: 'b', ucis: [move.uci] });
  return [say(bestPart), say(ui.lines.allows(played, line), true)];
}

/** Explain's sentences for `move`, none when it has nothing to add to the comment. */
export function explainHint(session: Session, move: JudgedMove): CommentPart[] {
  if (move.moveClass === 'book') {
    const opening = openingOf(session, move);
    return opening ? [say(opening)] : [];
  }
  return bestRequest(move) && move.bestSan ? linesHint(session, move) : [];
}
