import { type Color, parseSquare, type Piece, type Square } from '#shared/chess/index.ts';
import { lineMotif, type Motif, type MotifKind } from '#page/review/chess/motifs.ts';
import { attractionAt } from '#page/review/chess/attraction.ts';
import { clearanceAt } from '#page/review/chess/interference.ts';
import { xrayAt } from '#page/review/chess/xray.ts';
import { isPressureKind } from '#page/review/chess/motifs-pressure.ts';
import { playLine, type Ply } from '#page/review/chess/played-line.ts';
import type { PinnedTaker } from '#page/review/chess/rays.ts';
import { moveToken } from '#page/review/comment/tokens.ts';
import type { FactSentences, Named } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import type { Mark } from '#shared/board/marks.ts';
import { withMove } from './drawing.ts';
import { drawn, type Fact, pickBy, said, type Theme, withDetail } from './said.ts';
import { THEME_TOPICS } from './drawing-topic.ts';
import { pinMarks, pinnedTake } from './pinned-take.ts';
import { xrayLine } from './tactic-marks.ts';
import { attractionMarks, clearanceMarks, motifMarks } from './motif-marks.ts';
import { whichOne } from './which-one.ts';

// The tactic that wins what a line wins (chess/motifs.ts), named after the
// line's sentence, and tagged on the bubble.

const THEMES: Readonly<Record<MotifKind, Theme | null>> = {
  fork: 'fork',
  pin: 'pin',
  pinnedDefender: 'pin',
  skewer: 'skewer',
  discoveredAttack: 'discovered',
  discoveredCheck: 'discovered',
  doubleCheck: 'doubleCheck',
  capturingDefender: 'defender',
  trappedPiece: 'trapped',
  hangingPiece: 'hanging',
  xray: 'xray',
  attraction: 'attraction',
  interference: 'interference',
  clearance: 'clearance',
  deflection: 'defender',
  chasedDefender: 'defender',
  doubleAttack: 'fork',
  outnumbered: null,
  attacked: null,
};

export interface MotifLine {
  /** The plies the tactic is looked for in, maybe after the move that led to them. */
  readonly plies: readonly Ply[];
  /** How many of them come before the line written, and its chips play. */
  readonly offset: number;
  readonly winner: Color;
  /** The plies up to the gain, the offset's included. */
  readonly upTo: number;
  readonly base: 'a' | 'b';
  /** The tactic says it all: the line's sentence goes below it. */
  readonly lead?: boolean;
  /** The line's first move is the move played, on the board already. */
  readonly played?: boolean;
}

/**
 * `ucis` played from before the move, after the opponent's move that led
 * there when known: the motifs tell a piece left hanging from a trade by it.
 */
export function afterLastMove(
  move: MoveVerdict,
  ucis: readonly string[],
): Omit<MotifLine, 'winner' | 'upTo' | 'base'> {
  const last = move.previousMove;
  if (!last) return { plies: playLine(move.previousPosition.fen, ucis), offset: 0 };
  return { plies: playLine(last.previousPosition.fen, [last.uci, ...ucis]), offset: 1 };
}

/**
 * A pinned defender's pin and the capture it can't answer, drawn on the board
 * after the move, the one shown, when they stand there already.
 */
function pinDrawing(pin: PinnedTaker, line: MotifLine, capture: Ply): Mark[] | null {
  const shown = line.plies[line.offset - 1]?.after;
  const from = parseSquare(capture.uci.slice(0, 2));
  if (line.base !== 'a' || !shown || !from) return null;
  const stands = (square: Square): boolean => {
    const [now, then] = [shown.get(square), capture.before.get(square)];
    return now?.role === then?.role && now?.color === then?.color;
  };
  if (![pin.taker, pin.pinner, pin.behind, from].every(stands)) return null;
  return withMove(capture.uci, 'attack', pinMarks(pin));
}

/**
 * The tactic drawn when its move is the line's first: on the board already
 * when it's the move played, else after its arrow.
 */
function motifDrawing(motif: Motif, line: MotifLine): Mark[] | null {
  const first = line.plies[line.offset];
  if (motif.ply !== line.offset || !first) return null;
  const marks = motifMarks(motif, line.plies);
  if (line.played) return marks;
  return withMove(first.uci, line.base === 'a' ? 'attack' : 'defense', marks);
}

/** The fact `text`, followed by the tactic that wins it when one is sure. */
export function withMotif(text: string, line: MotifLine, facts: FactSentences): Fact {
  const { plies, offset, winner, upTo, base } = line;
  const motif = lineMotif(plies, winner, upTo);
  if (!motif || motif.ply < offset) return said(text);
  const played = plies.slice(offset, motif.ply + 1);
  const last = played.at(-1);
  if (!last) return said(text);
  const move = moveToken(last.san, last.color, { base, ucis: played.map(ply => ply.uci) });
  // Picked by the fact it follows, which its move already picked.
  if (motif.pin) {
    const take = pinnedTake(last, motif.pin, { base, ucis: played.map(ply => ply.uci) });
    if (!take || !last.captured) return said(text, 'pin');
    // Said plainly first; the line's moves and the pin's squares go below.
    const lost = {
      piece: last.captured,
      square: whichOne(last.before, last.uci.slice(2, 4), last.captured),
    };
    const pinned = {
      piece: take.pinned,
      square: whichOne(last.after, motif.pin.taker, take.pinned),
    };
    const plain = pickBy(facts.pinnedGuard(lost, pinned), text);
    const fact = said(plain, 'pin', drawn('pins', pinDrawing(motif.pin, line, last)));
    return withDetail(fact, `${text} ${pickBy(facts.pinLine(take), text)}`);
  }
  const ways = isPressureKind(motif.kind)
    ? facts.pressure(motif.kind, move, named(motif, last))
    : facts.motif(motif.kind, move, named(motif, last));
  const theme = THEMES[motif.kind];
  const drawing = drawn(theme ? THEME_TOPICS[theme] : 'threats', motifDrawing(motif, line));
  if (!ways) return said(text, theme, drawing);
  const told = pickBy(ways, text);
  return line.lead
    ? withDetail(said(told, theme, drawing), text)
    : said(`${text} ${told}`, theme, drawing);
}

/** The motif's pieces, by their squares where they stand around its move. */
const named = ({ pieces, at = [] }: Motif, { before, after }: Ply): Named[] =>
  pieces.map((piece, i) => {
    const square = at[i];
    if (square === undefined || square === null) return { piece, square: null };
    const board = after.get(square)?.role === piece.role ? after : before;
    return { piece, square: whichOne(board, square, piece) };
  });

// The idea of a move on the way to a mate, said after it: a sacrifice taken
// back through by an x-ray, a king lured in, a line cleared.
interface Idea {
  readonly kind: MotifKind;
  readonly pieces: Named[];
  readonly drawing: Mark[] | null;
}

function ideaOf(plies: readonly Ply[]): Idea | null {
  const [lands] = plies;
  if (!lands) return null;
  const name = (piece: Piece, at: Square): Named => ({
    piece,
    square: whichOne(lands.after, at, piece),
  });
  const xray = xrayAt(plies, 0);
  if (xray)
    return {
      kind: 'xray',
      pieces: [name(xray.slider, xray.from), name(xray.screen, xray.through)],
      drawing: xrayLine(xray),
    };
  const lure = attractionAt(plies, 0);
  if (lure?.piece.role === 'king') {
    const pieces = [{ piece: lure.piece, square: null }];
    return { kind: 'attraction', pieces, drawing: attractionMarks(plies, 0) };
  }
  const slider = clearanceAt(plies, 0);
  if (!slider) return null;
  const pieces = [{ piece: slider, square: null }];
  return { kind: 'clearance', pieces, drawing: clearanceMarks(plies, 0) };
}

/**
 * The idea of the move that starts a mate, an x-ray, an attraction or a
 * clearance, if any, and its drawing on the board after the move.
 */
export function mateIdea(
  move: MoveVerdict,
  facts: FactSentences,
): { readonly text: string; readonly drawing: Mark[] | null } | null {
  const plies = playLine(move.previousPosition.fen, [move.uci, ...(move.after.line ?? [])]);
  const idea = ideaOf(plies);
  const ways = idea && facts.motif(idea.kind, moveToken(move.san, move.color), idea.pieces);
  return ways ? { text: pickBy(ways, move.uci), drawing: idea.drawing } : null;
}
