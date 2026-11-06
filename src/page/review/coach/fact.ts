import { type Board, type Color, opposite, parseFen, type Piece } from '#shared/chess/index.ts';
import { forkedBy } from '#page/review/chess/fork.ts';
import { pieceOn } from '#page/review/chess/material.ts';
import { roleOfLetter, sanOf } from '#page/review/chess/notation.ts';
import { isError, type MoveClass } from '#page/review/classes/classes.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import type { FactSentences, ReviewLanguage } from '#page/review/i18n/types.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { oppositeWings } from './attack-plans.ts';
import { bestFact, littleBetterFact } from './best-fact.ts';
import { captureFact } from './capture-fact.ts';
import { blocksFact, castlingFact } from './castling.ts';
import { reasonMarks } from './drawing.ts';
import { errorFindings, mateDistance, mates } from './error-fact.ts';
import { inBetweenFact } from './in-between.ts';
import { nextFact } from './next-fact.ts';
import { gainFact, mateLine } from './line-facts.ts';
import { pinnedOfferFact } from './pinned-take.ts';
import { planFact, raceFact } from './plan.ts';
import { withGift } from './greek-gift.ts';
import { desperadoFact } from './desperado.ts';
import { mateBoard, matedBy, withPattern } from './mate-pattern.ts';
import { mateIdea } from './motif-fact.ts';
import { perpetualFact } from './perpetual.ts';
import { stalemateFact } from './stalemate.ts';
import { drawn, type Fact, oneOf, said, type Theme } from './said.ts';
import { doubledFact } from './shape-facts.ts';
import { isolatedFact } from './structure-facts.ts';
import { NO_THREATS, parriedFact, type Threats, threatensFact } from './threat-facts.ts';
import { mateMarks } from './tactic-marks.ts';
import { checkFact } from './check-fact.ts';
import { evaluationLevel } from './trajectory.ts';
import { freshTold, isNew, type Told } from './told.ts';

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
  /** The ideas said on the moves just before, and those said now. */
  readonly told: Told;
}

const PUNISHERS: ReadonlySet<MoveClass> = new Set<MoveClass>([
  'brilliant',
  'great',
  'best',
  'excellent',
]);
const PUNISHED: ReadonlySet<MoveClass> = new Set<MoveClass>(['mistake', 'blunder', 'miss']);

/** Whether the move punishes the opponent's error just before it. */
export function punishes(move: MoveVerdict): boolean {
  const previousClass = move.previousMove?.moveClass;
  return (
    PUNISHERS.has(move.moveClass) && previousClass !== undefined && PUNISHED.has(previousClass)
  );
}

// What stands out in a move that needs no correction: what its line wins (a
// sacrifice aside, which says what it offers, or the pin that keeps it from
// being taken), the only move.
function standoutFact(input: FactInput, moved: Piece | undefined): Fact | null {
  const { move, facts, me, them } = input;
  const sacrifice = move.moveClass === 'brilliant';
  const gain = sacrifice ? null : (gainFact(input) ?? inBetweenFact(input));
  if (gain !== null) return gain;
  const { facts: sentences, before, after, theirs } = input;
  const race = raceFact({ move, sentences, before, after, theirs });
  if (race !== null) return race;
  // The opponent's move is read for what it threatens first, even a capture or a check;
  // the reader's capture or check, and any promotion, for a mate it stops or threatens only.
  const matesOnly = move.san.includes('=') || (!input.theirs && /[x+]/.test(move.san));
  const threat = sacrifice ? null : threatsFact(input, matesOnly);
  if (threat !== null) return threat;
  const pinned = sacrifice ? pinnedOfferFact(input) : null;
  if (pinned !== null) return pinned;
  if (move.moveClass === 'brilliant' && moved) {
    const piece: Piece = { role: moved.role, color: me };
    const taken = pieceOn(before, move.uci.slice(2, 4));
    const ways = taken ? facts.offeredFor(piece, taken, them) : facts.offered(piece, them);
    return said(oneOf(ways, move), 'sacrifice');
  }
  return onlyMoveFact(input);
}

// The only move, unless it captures, which the capture says: what it takes is the point.
function onlyMoveFact({ move, facts, me, sign }: FactInput): Fact | null {
  if (move.moveClass !== 'great' || move.san.includes('x')) return null;
  const ahead = evaluationLevel(move.after) * sign >= 2;
  return said(ahead ? oneOf(facts.keepsAdvantage, move) : oneOf(facts.holdsPosition(me), move));
}

// A quiet move's point is often the threat it stops, else the one it makes.
function threatsFact(input: FactInput, matesOnly: boolean): Fact | null {
  const { before, after } = input.threats;
  const parried = before && parriedFact(input, before, matesOnly);
  if (parried) return parried;
  const threat = after && threatensFact(input, after, matesOnly);
  // The same material threat, said a move before, is no news; a mate always is.
  if (!threat || 'mate' in after.record) return threat;
  return isNew(input.told, 'threatens', after.record.best ?? '') ? threat : null;
}

const alone = (fact: Fact | null): Findings => ({ fact, followUp: null });

// A sure mate under way after the move, move by move: the mover's, or the one it can't stop.
function mateUnderWay({ move, facts, sign, me, them, told }: FactInput): Fact | null {
  const line = mateLine(move.after, move.position.fen, 'a', { short: true });
  if (line === null) return null;
  const ours = mates(move.after, sign);
  const ways = ours ? facts.mateFollows(line) : facts.mateUnstoppable(line);
  const end = mateBoard(move.after, move.position.fen);
  const text = withPattern(oneOf(ways, move), end, { mated: ours ? them : me, facts, told });
  const idea = ours ? mateIdea(move, facts) : null;
  return said(idea ? `${text} ${idea.text}` : text, 'mate', drawn('lines', idea?.drawing ?? null));
}

// An error punished, said when nothing more concrete is (a recapture says it
// takes back, a quiet move what it does), and only when it leaves the punisher
// better off.
function punishedFact({ move, facts, them, sign }: FactInput): Fact | null {
  // An answer to a check is forced, not a punishment.
  const forced = move.previousPosition.san?.includes('+') ?? false;
  const better = !forced && evaluationLevel(move.after) * sign >= 1;
  return punishes(move) && better ? said(oneOf(facts.punishesAtOnce(them), move)) : null;
}

// A mate under way, what stands out, else the fork a quiet move makes: a
// capture says what it takes first.
function tacticFact(input: FactInput, moved: Piece | undefined): Fact | null {
  const standout = mateUnderWay(input) ?? standoutFact(input, moved);
  if (standout !== null) return standout;
  return input.move.san.includes('x') ? null : forkFact(input);
}

function forkFact(input: FactInput): Fact | null {
  const { move, facts, them, after } = input;
  const [first, second] = forkedBy(move.previousPosition.fen, move.uci);
  if (!first || !second) return null;
  const scene = { uci: move.uci, before: input.before, after, shown: after, toMove: them };
  const drawing = reasonMarks({ kind: 'fork', first, second }, scene);
  return said(oneOf(facts.forks(first, second), move), 'fork', drawn('forks', drawing));
}

// What a capture takes, then the better move when it fell short, else the fork it makes.
function captureFindings(input: FactInput, moved: Piece, dest: string): Findings | null {
  const capture = desperadoFact(input, moved) ?? captureFact(input, moved, dest);
  const short = input.move.moveClass === 'good' || input.move.moveClass === 'excellent';
  if (capture === null) return null;
  const after =
    forkFact(input) ?? doubledFact(input) ?? isolatedFact(input, input.them) ?? castlingFact(input);
  return { fact: capture, followUp: short ? littleBetterFact(input) : after };
}

function goodFindings(input: FactInput): Findings {
  const { move, facts, me, after } = input;
  const dest = move.uci.slice(2, 4);
  const moved = pieceOn(after, dest);
  // Checks to a draw are the story, whatever else they parry.
  const tactic = perpetualFact(input) ?? withGift(input, tacticFact(input, moved));
  if (tactic !== null) return alone(tactic);
  const promotion = roleOfLetter(/=([QRBN])/.exec(move.san)?.[1] ?? '');
  if (promotion)
    return alone(
      said(oneOf(facts.promotes({ role: promotion, color: me }, move.san.includes('+')), move)),
    );
  // The opponent's castling is theirs to care about: a remark says it.
  if (move.san.startsWith('O-O')) {
    const ways = oppositeWings(after, me) ? facts.castlesOpposite : facts.castles;
    return alone(input.theirs ? null : said(oneOf(ways, move)));
  }
  const capture = moved && move.san.includes('x') ? captureFindings(input, moved, dest) : null;
  if (capture !== null) return capture;
  return alone(quietFindings(input));
}

// What a quiet move does says more than that it punishes an error; a check
// that does nothing else forces an answer, and answers a check with one.
function quietFindings(input: FactInput): Fact | null {
  const quiet = blocksFact(input) ?? quietFact(input) ?? castlingFact(input);
  return quiet ?? punishedFact(input) ?? nextFact(input) ?? checkFact(input);
}

// The plies of the opening, where what a move does matters more than a slightly better one.
const OPENING_PLIES = 20;

// What a quiet good move does, or the move a little better: a good move's
// remarks say there was better, so the coach names it, even in a decided game.
function quietFact(input: FactInput): Fact | null {
  const { move, facts, before, after, theirs } = input;
  const plan = planFact({ move, sentences: facts, before, after, theirs });
  const better = move.moveClass === 'good' ? littleBetterFact(input) : null;
  return move.position.ply <= OPENING_PLIES ? (plan ?? better) : (better ?? plan);
}

/** The engine's move from `fen` in SAN, its check a mate when its record mates in one. */
function mateMarked(fen: string, uci: string, record: PositionRecord): string {
  const san = sanOf(fen, uci);
  return 'mate' in record && Math.abs(record.mate) === 1 ? san.replace(/\+$/, '#') : san;
}

/**
 * What the coach finds about the move: one fact, and after an error, the
 * reply to fear or the move to play, read with the threats around it.
 */
export function findings(
  move: MoveVerdict,
  { facts, viewer }: Pick<ReviewLanguage, 'facts' | 'viewer'>,
  threats: Threats = NO_THREATS,
  told: Told = freshTold(),
): Findings {
  const me = move.color;
  const them = opposite(me);
  const sign = me === 'white' ? 1 : -1;
  if (move.san.includes('#')) {
    const end = matedBy(move.previousPosition.fen, move.uci);
    const text = withPattern(oneOf(facts.checkmate(them), move), end, { mated: them, facts, told });
    const net = mateMarks(parseFen(move.position.fen).board, them);
    return { fact: said(text, 'mate', drawn('mates', net)), followUp: null };
  }
  const best =
    move.bestSan && move.best
      ? moveToken(mateMarked(move.previousPosition.fen, move.best, move.before), me, {
          base: 'b',
          ucis: [move.best],
        })
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
    ? moveToken(mateMarked(move.position.fen, replyUci, move.after), them, {
        base: 'a',
        ucis: [replyUci],
      })
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
    told,
  };
  return judgedFindings(input);
}

// A stalemate says it all, the move that kept the win after it; else the error's or the good move's.
function judgedFindings(input: FactInput): Findings {
  const { move } = input;
  const stalemate = stalemateFact(input);
  if (stalemate !== null)
    return { fact: stalemate, followUp: isError(move.moveClass) ? bestFact(input) : null };
  return isError(move.moveClass) ? errorFindings(input) : goodFindings(input);
}

/** The ideas a move's comment says why of, for the moves after it not to say them again. */
export function ideasOf(
  move: MoveVerdict,
  language: Pick<ReviewLanguage, 'facts' | 'viewer'>,
  threats: Threats = NO_THREATS,
): ReadonlySet<string> {
  const told = freshTold();
  findings(move, language, threats, told);
  return told.now;
}

/** The tactics the coach's findings are about, for the bubble's tags. */
export function themesOf({ fact: found, followUp }: Findings): Theme[] {
  const themes = [found?.theme, followUp?.theme].filter(
    theme => theme !== null && theme !== undefined,
  );
  return [...new Set(themes)];
}
