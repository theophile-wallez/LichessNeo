import type { Piece } from '#shared/chess/index.ts';
import { capitalize, definite } from './en-grammar.ts';
import type { PlanSentences, Viewer } from './types.ts';

// What a quiet move does for the position.
export function plansEn(viewer: Viewer): PlanSentences {
  const the = (piece: Piece): string => definite(viewer, piece);
  return {
    develops: piece => [
      `Another piece out: ${the(piece)}.`,
      `${capitalize(the(piece))} comes into play.`,
      `${capitalize(the(piece))} joins the game, right on time.`,
    ],
    outpost: piece => [
      `${capitalize(the(piece))} lands on an outpost: no pawn can chase it away.`,
      `${capitalize(the(piece))} settles on a fine outpost, out of the pawns’ reach.`,
    ],
    openFile: halfOpen => {
      const file = `the ${halfOpen ? 'half-open' : 'open'} file`;
      return [
        `The rook takes ${file}, where it belongs.`,
        `The rook takes ${file}.`,
        `The rook grabs ${file}: that’s where rooks come alive.`,
      ];
    },
    passedPawn: made =>
      made
        ? ['A passed pawn is born.', 'That creates a passed pawn, an asset for the endgame.']
        : [
            'The passed pawn moves on.',
            'The passed pawn marches on.',
            'Passed pawns must be pushed, and this one is on its way.',
          ],
    centralKing: [
      'The king heads for the center, where it counts in an endgame.',
      'In the endgame the king is a fighter: it heads for the center.',
    ],
  };
}
