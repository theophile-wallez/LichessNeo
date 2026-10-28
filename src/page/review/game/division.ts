import type { TreeNode } from '#page/lichess/tree.ts';
import { divide, type Division } from '#page/review/rating/phases.ts';
import type { GameWork } from '#page/review/session.ts';

// Where the game's middlegame and endgame start, as the rating divides it
// (rating/phases.ts): worked out once a game, for the graph and the move list.

const divisions = new WeakMap<readonly TreeNode[], Division>();

export function gameDivision({ nodes }: GameWork): Division {
  let division = divisions.get(nodes);
  if (!division) {
    division = divide(nodes.map(node => node.fen));
    divisions.set(nodes, division);
  }
  return division;
}
