import { type Board, type Color, opposite, parseFen, type Piece } from '#shared/chess/index.ts';
import { forkedBy } from '#page/review/chess/fork.ts';
import { pieceOn } from '#page/review/chess/material.ts';
import { roleOfLetter, uciToSan } from '#page/review/chess/notation.ts';
import { isError, type MoveClass } from '#page/review/classes/classes.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import type { FactSentences, ReviewLanguage } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { littleBetterFact } from './best-fact.ts';
import { captureFact } from './capture-fact.ts';
import { reasonMarks } from './drawing.ts';
import { errorFindings, mateDistance, mates } from './error-fact.ts';
import { gainFact } from './line-facts.ts';
import { planFact, raceFact } from './plan.ts';
import { type Fact, oneOf, said, type Theme } from './said.ts';
import { NO_THREATS, parriedFact, type Threats, threatensFact } from './threat-facts.ts';
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

// What stands out in a move that needs no correction: what its line wins (a
// sacrifice aside, which says what it offers), an error punished, the only move.
function standoutFact(input: FactInput, moved: Piece | undefined): Fact | null {
  const { move, facts, me, them, sign } = input;
  const sacrifice = move.moveClass === 'brilliant';
  const gain = sacrifice ? null : gainFact(input);
  if (gain !== null) return gain;
  const { facts: sentences, before, after, theirs } = input;
  const race = raceFact({ move, sentences, before, after, theirs });
  if (race !== null) return race;
  // The opponent's move is read for what it threatens first, even a capture or a check;
  // the reader's capture or check, for a mate it stops or threatens only.
  const threat = sacrifice ? null : threatsFact(input, !input.theirs && /[x+]/.test(move.san));
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
function threatsFact(input: FactInput, matesOnly: boolean): Fact | null {
  const { before, after } = input.threats;
  return (
    (before && parriedFact(input, before, matesOnly)) ??
    (after && threatensFact(input, after, matesOnly))
  );
}

function goodFact(input: FactInput): Fact | null {
  const { move, facts, me, them, after } = input;
  const dest = move.uci.slice(2, 4);
  const moved = pieceOn(after, dest);
  const standout = standoutFact(input, moved);
  if (standout !== null) return standout;
  const [first, second] = forkedBy(move.previousPosition.fen, move.uci);
  if (first && second) {
    const scene = { uci: move.uci, before: input.before, after, shown: after, toMove: them };
    const drawing = reasonMarks({ kind: 'fork', first, second }, scene);
    return said(oneOf(facts.forks(first, second), move), 'fork', drawing);
  }
  const promotion = roleOfLetter(/=([QRBN])/.exec(move.san)?.[1] ?? '');
  if (promotion) return said(oneOf(facts.promotes({ role: promotion, color: me }), move));
  // The opponent's castling is theirs to care about: a remark says it.
  if (move.san.startsWith('O-O')) return input.theirs ? null : said(oneOf(facts.castles, move));
  const capture = moved && move.san.includes('x') ? captureFact(input, moved, dest) : null;
  if (capture !== null) return capture;
  if (move.san.includes('+')) return said(oneOf(facts.checkForces(them), move));
  return quietFact(input);
}

// The plies of the opening, where what a move does matters more than a slightly better one.
const OPENING_PLIES = 20;

// What a quiet good move does, or the move a little better: a good move's
// remarks say there was better, so the coach names it, even in a decided game.
function quietFact(input: FactInput): Fact | null {
  const { move, facts, before, after, theirs } = input;
  const plan = planFact({ move, sentences: facts, before, after, theirs });
  const better = move.moveClass === 'good' ? littleBetterFact(input) : null;
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
