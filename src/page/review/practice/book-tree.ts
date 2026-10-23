import { parsePlacement, START_PLACEMENT, writePlacement } from '#shared/chess/fen.ts';
import { playSan } from '#shared/chess/san.ts';
import { type Board, type Color, opposite } from '#shared/chess/types.ts';
import type { BookMove, BookPosition } from './book.ts';
import type { PgnTree } from './pgn-tree.ts';

// A book of a line's own, from a tree of moves (a study's chapter, the user's
// repertoire, a trap's line): each position's moves are the tree's, the first
// its main move, as a study's main line is. Positions are keyed as practice's
// books are, by their pieces and the side to move.

const keyOf = (board: Board, turn: Color): string => `${writePlacement(board)} ${turn[0]}`;

/** The tree's moves from each position, from the standard start. */
export function treeBook(tree: PgnTree): Map<string, BookPosition> {
  const book = new Map<string, BookPosition>();
  const walk = (node: PgnTree, board: Board, turn: Color): void => {
    const moves: BookMove[] = [];
    for (const [i, child] of node.children.entries()) {
      const played = playSan(board, turn, child.san);
      if (!played) continue;
      // The main move counts as the others together, so it's the book's most played.
      const games = i === 0 ? Math.max(node.children.length - 1, 1) : 1;
      const score = { white: 0.5, black: 0.5 };
      moves.push({ uci: played.uci, san: child.san, games, score, opening: '' });
      walk(child, played.board, opposite(turn));
    }
    const key = keyOf(board, turn);
    // A transposition: the moves of both ways.
    const known = book.get(key)?.moves ?? [];
    const all = [...known, ...moves.filter(move => !known.some(each => each.san === move.san))];
    const games = all.reduce((sum, move) => sum + move.games, 0);
    book.set(key, { games, moves: all, opening: '' });
  };
  walk(tree, parsePlacement(START_PLACEMENT), 'white');
  return book;
}
