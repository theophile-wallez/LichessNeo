import {
  type Board,
  type Color,
  fenTurn,
  kingSquare,
  opposite,
  parseFen,
} from '#shared/chess/index.ts';
import { boardAfter } from '#page/review/chess/board-after.ts';
import { playLine } from '#page/review/chess/played-line.ts';
import { attackersOn } from '#page/review/chess/rays.ts';
import type { PositionRecord } from '#page/review/evaluation/score.ts';
import type { FactSentences } from '#page/review/i18n/types.ts';
import { type ContactMate, contactMate } from './mate-contact.ts';
import { type LineMate, lineMate, walledMate } from './mate-line.ts';
import { type MinorMate, minorMate } from './mate-minor.ts';
import { sceneOf } from './mate-scene.ts';
import { isNew, type Told } from './told.ts';

// The mates with a name, as Lichess's practice teaches them, read off the
// mate's board (mate-minor.ts, mate-line.ts, mate-contact.ts) and said after
// the mate. A double check has none.

export type MatePattern = MinorMate | LineMate | ContactMate;

/** The name of the mate of `mated`'s king on `board`, if it has one. */
export function matePatternOf(board: Board, mated: Color): MatePattern | null {
  const king = kingSquare(board, mated);
  const checkers = king ? attackersOn(board, king, opposite(mated)) : [];
  const [checker] = checkers;
  if (!king || !checker || checkers.length > 1) return null;
  const scene = sceneOf(board, king, mated, checker);
  return minorMate(scene) ?? walledMate(scene) ?? contactMate(scene) ?? lineMate(scene);
}

/** The board a record's mate ends on, played from `fen`, when its line reaches it. */
export function mateBoard(record: PositionRecord, fen: string): Board | null {
  if (!('mate' in record) || record.mate === 0) return null;
  const mating: Color = record.mate > 0 ? 'white' : 'black';
  const moves = record.line ?? (record.best ? [record.best] : []);
  const length = 2 * Math.abs(record.mate) - (fenTurn(fen) === mating ? 1 : 0);
  const last = playLine(fen, moves.slice(0, length)).at(-1);
  if (!last || last.color !== mating || moves.length < length) return null;
  return boardAfter(last.before, last.uci);
}

interface Named {
  readonly mated: Color;
  readonly facts: FactSentences;
  /** What the moves just before said; none, and the name is said. */
  readonly told?: Told | undefined;
}

/**
 * `text`, then the mate's name when `board` shows `mated`'s king mated in one
 * of the named ways, said once over the moves that lead to it.
 */
export function withPattern(
  text: string,
  board: Board | null,
  { mated, facts, told }: Named,
): string {
  const pattern = board && matePatternOf(board, mated);
  if (!pattern || (told && !isNew(told, 'matePattern', `${pattern}:${mated}`))) return text;
  return `${text} ${facts.matePattern(pattern)[0]}`;
}

/** The board after the mate on `fen` `uci` plays. */
export const matedBy = (fen: string, uci: string | null | undefined): Board | null =>
  uci ? boardAfter(parseFen(fen).board, uci) : null;
