import { parsePlacement, START_PLACEMENT, writePlacement } from '#shared/chess/fen.ts';
import { playSan } from '#shared/chess/san.ts';
import { type Board, type Color, opposite } from '#shared/chess/types.ts';
import type { Mark } from '#shared/board/marks.ts';
import { type PgnNode, parsePgn, type PgnTree } from '#page/review/practice/pgn-tree.ts';
import { commentShapes } from './shapes.ts';

// The coach's opening theory is a public study on lichess.org, which anyone
// can read and its contributors edit (tools/openings/study.py pushes the
// project's own): each position's comment is what the coach explains there,
// its moves those theory goes on with, the first its main one. A move marked
// ?, ?? or ?! is a mistake players often make there: its comment says why, and
// the moves after it punish it. A comment's shapes ([%cal …], [%csl …]) are
// what the coach draws there.

export interface StudyMove {
  readonly san: string;
  readonly uci: string;
  readonly color: Color;
}

/** A position the study comments, with what its comment's moves are read against. */
export interface StudyPosition {
  /** Its comment, without the shapes. */
  readonly comment: string;
  readonly marks: readonly Mark[];
  readonly board: Board;
  readonly turn: Color;
  /** The moves that led there in its chapter. */
  readonly line: readonly StudyMove[];
  readonly next: readonly StudyMove[];
  /** The move that reached it is a mistake: its comment says why, `next` how it's punished. */
  readonly mistake: boolean;
}

const MISTAKE_MARKS: ReadonlySet<string> = new Set(['?', '??', '?!']);

/** Whether the study marks `node`'s move as a mistake, with a NAG or a glyph after it. */
const isMistake = (node: PgnNode): boolean =>
  MISTAKE_MARKS.has(node.mark ?? /[?!]{1,2}$/.exec(node.san)?.[0] ?? '');

/** A position's pieces and side to move: a transposition finds it too. */
export const positionKey = (fen: string): string => fen.split(' ').slice(0, 2).join(' ');

const keyOf = (board: Board, turn: Color): string => `${writePlacement(board)} ${turn[0]}`;

interface Played {
  readonly node: PgnNode;
  readonly move: StudyMove;
  readonly board: Board;
}

/** The moves from `tree`'s position, those that can't be played left out. */
function playedFrom(tree: PgnTree, board: Board, turn: Color): Played[] {
  return tree.children.flatMap(node => {
    const played = playSan(board, turn, node.san);
    if (!played) return [];
    return [{ node, move: { san: node.san, uci: played.uci, color: turn }, board: played.board }];
  });
}

/**
 * Whether a position seen again takes the place of the one kept: theory's own
 * does over a mistake's, as when a mistake of one move order transposes into
 * another chapter's opening. Otherwise the first one stays.
 */
const replaces = (kept: StudyPosition | undefined, mistake: boolean): boolean =>
  !kept || (kept.mistake && !mistake);

/** The positions a study's export comments, by key: the first of a position commented twice. */
export function studyPositions(pgn: string): Map<string, StudyPosition> {
  const positions = new Map<string, StudyPosition>();
  const walk = (tree: PgnTree, board: Board, turn: Color, line: readonly StudyMove[]): void => {
    const after = opposite(turn);
    for (const { node, move, board: reached } of playedFrom(tree, board, turn)) {
      const path = [...line, move];
      const key = keyOf(reached, after);
      const { text, marks } = commentShapes(node.comment);
      const mistake = isMistake(node);
      if (text && replaces(positions.get(key), mistake)) {
        // A mistake played there isn't a move theory goes on with.
        const next = playedFrom(node, reached, after)
          .filter(each => !isMistake(each.node))
          .map(each => each.move);
        positions.set(key, {
          comment: text,
          marks,
          board: reached,
          turn: after,
          line: path,
          next,
          mistake,
        });
      }
      walk(node, reached, after, path);
    }
  };
  for (const { tree } of parsePgn(pgn)) walk(tree, parsePlacement(START_PLACEMENT), 'white', []);
  return positions;
}
