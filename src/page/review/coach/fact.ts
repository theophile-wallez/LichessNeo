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
import type { FactSentences, ReviewLanguage } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { bestFact, littleBetterFact, missFact } from './best-fact.ts';
import { captureFact } from './capture-fact.ts';
import { bestGainFact, gainFact, lossFact, mateLine } from './line-facts.ts';
import { planFact } from './plan.ts';
import { type Fact, oneOf, said, type Theme } from './said.ts';
import {
  letsThrough,
  NO_THREATS,
  parriedFact,
  type Threats,
  threatensFact,
} from './threat-facts.ts';
import { evaluationLevel } from './trajectory.ts';

// One concrete thing the board or the engine shows about a move: a piece left
// hanging, a mate allowed or missed, a fork, the better move, what a capture
// or a line wins. After a mistake or a blunder, also the reply that punishes
// it, or the move to play instead.

export type { Theme } from './said.ts';

export interface Findings {
  readonly fact: Fact | null;
  /** A second fact, when the first doesn't say it: what punishes an error, or what to play instead. */
  readonly followUp: Fact | null;
}

export interface FactInput {
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
  readonly threats: Threats;
  /** The move isn't the reader's: what it threatens comes first. */
  readonly theirs: boolean;
}

const PUNISHERS: ReadonlySet<MoveClass> = new Set<MoveClass>(['brilliant', 'great', 'best']);
const PUNISHED: ReadonlySet<MoveClass> = new Set<MoveClass>(['mistake', 'blunder', 'miss']);

/** Whether the move punishes the opponent's error just before it. */
export function punishes(move: MoveVerdict): boolean {
  const previousClass = move.previousMove?.moveClass;
  return (
    PUNISHERS.has(move.moveClass) && previousClass !== undefined && PUNISHED.has(previousClass)
  );
}
const THREATENED: ReadonlySet<MoveClass> = new Set<MoveClass>(['mistake', 'blunder']);

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
  if (attackers(after, square, me).length === 0)
    return said(oneOf(facts.leftUndefended(lost), move), 'hanging');
  if (Math.min(...attackerValues(after, square, them)) < PIECE_VALUES[victim.role])
    return said(oneOf(facts.answersAndWins(them, lost), move), 'hanging');
  return null;
}

// A mate the move let in, or missed.
function mateFact(input: FactInput): Fact | null {
  const { move, facts, them, sign, best, reply } = input;
  if (mates(move.after, -sign) && !mates(move.before, -sign) && reply) {
    const line = mateLine(move.after, move.position.fen, 'a');
    const ways = line ? facts.forcesMate(them, line) : facts.canForceMate(them, reply);
    return said(oneOf(ways, move), 'mate');
  }
  if (mates(move.before, sign) && !mates(move.after, sign) && best) {
    const line = mateLine(move.before, move.previousPosition.fen, 'b') ?? best;
    return said(
      oneOf(facts.wouldForceMate(line, Math.abs(mateDistance(move.before))), move),
      'mate',
    );
  }
  return null;
}

/** What the reply does, for an error whose fact doesn't name it. */
function threatFact({ move, facts, them, reply }: FactInput): Fact | null {
  if (!THREATENED.has(move.moveClass) || !move.after.best || !reply) return null;
  const forked = forkedBy(move.position.fen, move.after.best);
  if (forked[0] && forked[1])
    return said(oneOf(facts.allowsFork(reply, forked[0], forked[1]), move), 'fork');
  return said(oneOf(facts.canPlay(them, reply), move));
}

function errorFindings(input: FactInput): Findings {
  const { move, best } = input;
  const mate = mateFact(input);
  if (mate !== null) return { fact: mate, followUp: null };
  if (move.moveClass === 'miss' && best) return { fact: missFact(input), followUp: null };
  const lost = lostPieceFact(input);
  if (lost !== null) return { fact: lost, followUp: null };
  const gain = bestGainFact(input);
  const { before: threat } = input.threats;
  const loss = lossFact(input, threat !== null && letsThrough(input, threat));
  if (loss !== null) return { fact: loss, followUp: gain ?? bestFact(input) };
  return { fact: gain ?? bestFact(input), followUp: threatFact(input) };
}

// What stands out in a move that needs no correction: what its line wins (a
// sacrifice aside, which says what it offers), an error punished, the only move.
function standoutFact(input: FactInput, moved: Piece | undefined): Fact | null {
  const { move, facts, me, them, sign } = input;
  const sacrifice = move.moveClass === 'brilliant';
  const gain = sacrifice ? null : gainFact(input);
  if (gain !== null) return gain;
  // The opponent's move is read for what it threatens first, even a capture or a check.
  const threatFirst = !sacrifice && (input.theirs || !/[x+]/.test(move.san));
  const threat = threatFirst ? threatsFact(input) : null;
  if (threat !== null) return threat;
  if (punishes(move)) return said(oneOf(facts.punishesAtOnce(them), move));
  if (move.moveClass === 'brilliant' && moved)
    return said(oneOf(facts.offered({ role: moved.role, color: me }, them), move), 'sacrifice');
  if (move.moveClass === 'great')
    return said(
      evaluationLevel(move.after) * sign >= 2
        ? oneOf(facts.keepsAdvantage, move)
        : oneOf(facts.holdsPosition(me), move),
    );
  return null;
}

// A quiet move's point is often the threat it stops, else the one it makes.
function threatsFact(input: FactInput): Fact | null {
  const { before, after } = input.threats;
  return (before && parriedFact(input, before)) ?? (after && threatensFact(input, after));
}

function goodFact(input: FactInput): Fact | null {
  const { move, facts, me, them, after } = input;
  const dest = move.uci.slice(2, 4);
  const moved = pieceOn(after, dest);
  const standout = standoutFact(input, moved);
  if (standout !== null) return standout;
  const forked = forkedBy(move.previousPosition.fen, move.uci);
  if (forked[0] && forked[1]) return said(oneOf(facts.forks(forked[0], forked[1]), move), 'fork');
  const promotion = roleOfLetter(/=([QRBN])/.exec(move.san)?.[1] ?? '');
  if (promotion) return said(oneOf(facts.promotes({ role: promotion, color: me }), move));
  if (move.san.startsWith('O-O')) return said(oneOf(facts.castles, move));
  const capture = moved && move.san.includes('x') ? captureFact(input, moved, dest) : null;
  if (capture !== null) return capture;
  if (move.san.includes('+')) return said(oneOf(facts.checkForces(them), move));
  return quietFact(input);
}

// The plies of the opening, where what a move does matters more than a slightly better one.
const OPENING_PLIES = 20;

/** Whether the game is decided: a winning position, or a mate, for either side. */
const decided = (move: MoveVerdict): boolean => Math.abs(evaluationLevel(move.after)) >= 3;

// What a quiet good move does, or the move a little better, unless the game is decided.
function quietFact(input: FactInput): Fact | null {
  const { move, facts, before, after } = input;
  const plan = planFact({ move, sentences: facts, before, after });
  const better = move.moveClass === 'good' && !decided(move) ? littleBetterFact(input) : null;
  return move.ply <= OPENING_PLIES ? (plan ?? better) : (better ?? plan);
}

/**
 * What the coach finds about the move: one fact, and after an error, the
 * reply to fear or the move to play, read with the threats around it.
 */
export function findings(
  move: MoveVerdict,
  { facts, viewer }: Pick<ReviewLanguage, 'facts' | 'viewer'>,
  threats: Threats = NO_THREATS,
): Findings {
  const me = move.color;
  const them = opposite(me);
  const sign = me === 'white' ? 1 : -1;
  if (move.san.includes('#'))
    return { fact: said(oneOf(facts.checkmate(them), move), 'mate'), followUp: null };
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
    return { fact: said(oneOf(text, move), 'mate'), followUp: null };
  }
  const replyUci = move.after.best;
  const reply = replyUci
    ? moveToken(uciToSan(move.position.fen, replyUci), them, { base: 'a', ucis: [replyUci] })
    : '';
  const before = parseFen(move.previousPosition.fen).board;
  const after = parseFen(move.position.fen).board;
  const theirs = viewer !== null && viewer !== me;
  const input: FactInput = {
    move,
    facts,
    me,
    them,
    sign,
    before,
    after,
    best,
    reply,
    threats,
    theirs,
  };
  return isError(move.moveClass) ? errorFindings(input) : { fact: goodFact(input), followUp: null };
}

/** The tactics the coach's findings are about, for the bubble's tags. */
export function themesOf({ fact: found, followUp }: Findings): Theme[] {
  const themes = [found?.theme, followUp?.theme].filter(
    theme => theme !== null && theme !== undefined,
  );
  return [...new Set(themes)];
}
