import { type Color, parseSquare, type Piece } from '#shared/chess/index.ts';
import { between, checkers } from '#page/review/chess/rays.ts';
import { playLine, type Ply } from '#page/review/chess/played-line.ts';
import type { FactInput } from './fact.ts';
import { lineOf } from './line-facts.ts';
import { planOf, watched } from './plan.ts';
import { type Fact, oneOf, said } from './said.ts';

// What a move does to castling: a check, or a trade, that drags the other
// king out before it could castle; a piece that steps in to block a check.

/** Whether `color` may still castle on either side, as the FEN says. */
function mayCastle(fen: string, color: Color): boolean {
  const rights = fen.split(' ')[2] ?? '-';
  return color === 'white' ? /[KQ]/.test(rights) : /[kq]/.test(rights);
}

// The plies of the engine's line within which the other king must move: its
// reply, or its answer to the next check.
const WITHIN = 3;

/** The line up to the other king's move, when the move drags it out of its castling. */
function dragged({ move, them }: FactInput): Ply[] | null {
  // With a mate on the board, castling is beside the point.
  if ('mate' in move.after || !mayCastle(move.position.fen, them) || !move.after.line) return null;
  const plies = playLine(move.position.fen, move.after.line.slice(0, WITHIN));
  const moved = plies.findIndex(ply => ply.color === them && ply.piece.role === 'king');
  const castles = plies[moved]?.san.startsWith('O-O') ?? true;
  // A king stepping out of a check, the move's or one along the line: not a king that chose to.
  const checked = moved === 0 ? move.san.includes('+') : plies[moved - 1]?.check === true;
  return moved < 0 || castles || !checked ? null : plies.slice(0, moved + 1);
}

/** A good move after which the other king has to move and give up castling. */
export function castlingFact(input: FactInput): Fact | null {
  const line = dragged(input);
  if (!line) return null;
  return said(oneOf(input.facts.losesCastling(input.them, lineOf(line, 'a')), input.move));
}

/** The piece moved, when it steps between the checker and its king. */
function blocker({ move, me, before, after }: FactInput): Piece | null {
  const king = [...after].find(([, piece]) => piece.role === 'king' && piece.color === me)?.[0];
  const [checker] = king ? checkers(before, me) : [];
  const to = parseSquare(move.uci.slice(2, 4));
  const piece = to && after.get(to);
  if (!king || !checker || !to || !piece) return null;
  return between(checker, king).includes(to) ? piece : null;
}

/** A piece, not the king, that steps in to block a check. */
export function blocksFact(input: FactInput): Fact | null {
  const { move, facts, before, after } = input;
  const { previousPosition, uci, san, color, position } = move;
  if (!previousPosition.san?.includes('+') || san.startsWith('K') || san.includes('x')) return null;
  // A good move's better one, and a block's own threat, say more.
  const plan = planOf({ color, ply: position.ply, uci, san, before, after });
  if (move.moveClass === 'good' || (plan && watched(plan))) return null;
  const piece = blocker(input);
  return piece && said(oneOf(facts.blocksCheck(piece), move));
}
