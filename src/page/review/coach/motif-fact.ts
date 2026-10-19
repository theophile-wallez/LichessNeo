import type { Color } from '#shared/chess/index.ts';
import { lineMotif, type MotifKind } from '#page/review/chess/motifs.ts';
import { playLine, type Ply } from '#page/review/chess/played-line.ts';
import { lineMoveToken } from '#page/review/comment/tokens.ts';
import type { FactSentences } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { type Fact, said, type Theme } from './said.ts';

// The tactic that wins what a line wins (chess/motifs.ts), named after the
// line's sentence, and tagged on the bubble.

const THEMES: Readonly<Record<MotifKind, Theme>> = {
  fork: 'fork',
  pin: 'pin',
  skewer: 'skewer',
  discoveredAttack: 'discovered',
  discoveredCheck: 'discovered',
  doubleCheck: 'doubleCheck',
  capturingDefender: 'defender',
  trappedPiece: 'trapped',
  hangingPiece: 'hanging',
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

/** The fact `text`, followed by the tactic that wins it when one is sure. */
export function withMotif(text: string, line: MotifLine, facts: FactSentences): Fact {
  const { plies, offset, winner, upTo, base } = line;
  const motif = lineMotif(plies, winner, upTo);
  if (!motif || motif.ply < offset) return said(text);
  const played = plies.slice(offset, motif.ply + 1);
  const move = lineMoveToken(played, { base, ucis: played.map(ply => ply.uci) });
  const named = facts.motif(motif.kind, move, motif.pieces);
  return said(named ? `${text} ${named}` : text, THEMES[motif.kind]);
}
