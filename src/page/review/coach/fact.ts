import {
  attackers,
  type Board,
  type Color,
  opposite,
  parseFen,
  parseSquare,
  type Piece,
} from '#shared/chess/index.ts';
import { forkedBy } from '#page/review/chess/fork.ts';
import { attackerValues, PIECE_VALUES, pieceOn } from '#page/review/chess/material.ts';
import { roleOfLetter, uciToSan } from '#page/review/chess/notation.ts';
import { isError, type MoveClass } from '#page/review/classes/classes.ts';
import { moveToken, squareToken } from '#page/review/comment/tokens.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { FactSentences } from '#page/review/i18n/types.ts';
import { PUNISHABLE } from '#page/review/judge/judge.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { evaluationLevel } from './trajectory.ts';

// One concrete thing the board or the engine shows about a move: a piece left
// hanging, a mate allowed or missed, a fork, the better move, what a capture
// won. After a mistake or a blunder, also the reply that punishes it.

/** The tactic a fact is about, which the bubble names on a tag. */
export type Theme = 'fork' | 'hanging' | 'mate' | 'sacrifice';

interface Fact {
  readonly text: string;
  readonly theme: Theme | null;
}

export interface Findings {
  readonly fact: Fact | null;
  /** The reply that punishes a mistake or a blunder, when the fact doesn't name it. */
  readonly threat: Fact | null;
}

interface FactInput {
  readonly move: MoveVerdict;
  readonly facts: FactSentences;
  readonly me: Color;
  readonly them: Color;
  /** 1 when the mover is White, -1 when Black. */
  readonly sign: number;
  readonly before: Board;
  readonly after: Board;
  /** The engine's move instead, as a token, or '' without one. */
  readonly best: string;
  /** The engine's reply, as a token, or '' without one. */
  readonly reply: string;
}

const PUNISHERS: ReadonlySet<MoveClass> = new Set<MoveClass>(['brilliant', 'great', 'best']);
const PUNISHED: ReadonlySet<MoveClass> = new Set<MoveClass>(['mistake', 'blunder', 'miss']);
const THREATENED: ReadonlySet<MoveClass> = new Set<MoveClass>(['mistake', 'blunder']);

const said = (text: string, theme: Theme | null = null): Fact => ({ text, theme });

/** Whether the side of `sign` has a mate on the board. */
const mates = (record: PositionRecord, sign: number): boolean =>
  'mate' in record && record.mate * sign > 0;

const mateDistance = (record: PositionRecord): number => ('mate' in record ? record.mate : 0);

// A piece of the mover's that the engine's reply wins.
function lostPieceFact(input: FactInput): Fact | null {
  const { move, facts, me, them, after, reply } = input;
  const square = parseSquare(move.after.best?.slice(2, 4) ?? '');
  const victim = square ? after.get(square) : undefined;
  if (!square || !victim || victim.color !== me || victim.role === 'king') return null;
  if (move.loss < 10 || PIECE_VALUES[victim.role] < 3) return null;
  const lost = { piece: victim, square: squareToken(square), reply };
  if (attackers(after, square, me).length === 0) return said(facts.leftUndefended(lost), 'hanging');
  if (Math.min(...attackerValues(after, square, them)) < PIECE_VALUES[victim.role])
    return said(facts.answersAndWins(them, lost), 'hanging');
  return null;
}

// A mate the move let in, or missed.
function mateFact(input: FactInput): Fact | null {
  const { move, facts, them, sign, best, reply } = input;
  if (mates(move.after, -sign) && !mates(move.before, -sign) && reply)
    return said(facts.canForceMate(them, reply), 'mate');
  if (mates(move.before, sign) && !mates(move.after, sign) && best)
    return said(facts.wouldForceMate(best, Math.abs(mateDistance(move.before))), 'mate');
  return null;
}

// The error a miss fails to punish: the opponent's last move, or the one before it, the
// punishment under way (judge.ts).
function missFact({ move, facts, them, best }: FactInput): Fact {
  return said(
    (move.previousMove?.loss ?? 0) >= PUNISHABLE
      ? facts.missedPunishment(them, best)
      : facts.unfinishedPunishment(them, best),
  );
}

// The better move, a fork or a capture when it was one.
function bestFact(input: FactInput): Fact | null {
  const { move, facts, them, before, best } = input;
  if (!best || !move.best) return null;
  const forked = forkedBy(move.previousPosition.fen, move.best);
  if (forked[0] && forked[1]) return said(facts.missedFork(best, forked[0], forked[1]), 'fork');
  const taken = pieceOn(before, move.best.slice(2, 4));
  if (taken?.color === them && taken.role !== 'pawn')
    return said(facts.strongerCapture(best, taken));
  return said(move.moveClass === 'inaccuracy' ? facts.morePrecise(best) : facts.betterMove(best));
}

/** What the reply does, for an error whose fact doesn't name it. */
function threatFact({ move, facts, them, reply }: FactInput): Fact | null {
  if (!THREATENED.has(move.moveClass) || !move.after.best || !reply) return null;
  const forked = forkedBy(move.position.fen, move.after.best);
  if (forked[0] && forked[1]) return said(facts.allowsFork(reply, forked[0], forked[1]), 'fork');
  return said(facts.canPlay(them, reply));
}

function errorFindings(input: FactInput): Findings {
  const { move, best } = input;
  const mate = mateFact(input);
  if (mate !== null) return { fact: mate, threat: null };
  if (move.moveClass === 'miss' && best) return { fact: missFact(input), threat: null };
  const lost = lostPieceFact(input);
  if (lost !== null) return { fact: lost, threat: null };
  return { fact: bestFact(input), threat: threatFact(input) };
}

function captureFact(input: FactInput, moved: Piece, dest: string): Fact | null {
  const { move, facts, me, them, before } = input;
  const square = parseSquare(dest);
  if (!square) return null;
  // Nothing on the square: en passant.
  const victim: Piece = { role: before.get(square)?.role ?? 'pawn', color: them };
  const previous = move.previousPosition;
  if (previous.san?.includes('x') && previous.uci?.slice(2, 4) === dest)
    return said(facts.takesBack(squareToken(dest)));
  if (attackers(before, square, them).length === 0)
    return said(facts.winsForFree(victim), 'hanging');
  if (PIECE_VALUES[victim.role] > PIECE_VALUES[moved.role])
    return said(facts.winsMaterial(victim, { role: moved.role, color: me }));
  return null;
}

// What stands out in a move that needs no correction.
function standoutFact(input: FactInput, moved: Piece | undefined): Fact | null {
  const { move, facts, me, them, sign } = input;
  const previousClass = move.previousMove?.moveClass;
  if (PUNISHERS.has(move.moveClass) && previousClass !== undefined && PUNISHED.has(previousClass))
    return said(facts.punishesAtOnce(them));
  if (move.moveClass === 'brilliant' && moved)
    return said(facts.offered({ role: moved.role, color: me }, them), 'sacrifice');
  if (move.moveClass === 'great')
    return said(
      evaluationLevel(move.after) * sign >= 2 ? facts.keepsAdvantage : facts.holdsPosition(me),
    );
  return null;
}

function goodFact(input: FactInput): Fact | null {
  const { move, facts, me, them, after, best } = input;
  const dest = move.uci.slice(2, 4);
  const moved = pieceOn(after, dest);
  const standout = standoutFact(input, moved);
  if (standout !== null) return standout;
  const forked = forkedBy(move.previousPosition.fen, move.uci);
  if (forked[0] && forked[1]) return said(facts.forks(forked[0], forked[1]), 'fork');
  const promotion = roleOfLetter(/=([QRBN])/.exec(move.san)?.[1] ?? '');
  if (promotion) return said(facts.promotes({ role: promotion, color: me }));
  if (move.san.startsWith('O-O')) return said(facts.castles);
  const capture = moved && move.san.includes('x') ? captureFact(input, moved, dest) : null;
  if (capture !== null) return capture;
  if (move.san.includes('+')) return said(facts.checkForces(them));
  return move.moveClass === 'good' && best ? said(facts.littleMorePrecise(best)) : null;
}

/** What the coach finds about the move: one fact, and the reply to fear after an error. */
export function findings(move: MoveVerdict, facts: FactSentences): Findings {
  const me = move.color;
  const them = opposite(me);
  const sign = me === 'white' ? 1 : -1;
  if (move.san.includes('#')) return { fact: said(facts.checkmate(them), 'mate'), threat: null };
  const best =
    move.bestSan && move.best
      ? moveToken(move.bestSan, me, { base: 'b', ucis: [move.best] })
      : move.bestSan && moveToken(move.bestSan, me);
  // A sure mate slowed down, or one let in sooner. The defense's length isn't
  // stated, because the engine reports long mates as longer than they are.
  if (move.slower && best) {
    const text = mates(move.before, sign)
      ? facts.matedIn(best, mateDistance(move.before) * sign)
      : facts.heldOutLonger(best);
    return { fact: said(text, 'mate'), threat: null };
  }
  const replyUci = move.after.best;
  const reply = replyUci
    ? moveToken(uciToSan(move.position.fen, replyUci), them, { base: 'a', ucis: [replyUci] })
    : '';
  const before = parseFen(move.previousPosition.fen).board;
  const after = parseFen(move.position.fen).board;
  const input: FactInput = { move, facts, me, them, sign, before, after, best, reply };
  return isError(move.moveClass) ? errorFindings(input) : { fact: goodFact(input), threat: null };
}

/** The tactics the coach's findings are about, for the bubble's tags. */
export function themesOf({ fact: found, threat }: Findings): Theme[] {
  const themes = [found?.theme, threat?.theme].filter(
    theme => theme !== null && theme !== undefined,
  );
  return [...new Set(themes)];
}
