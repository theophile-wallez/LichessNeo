import type { Piece } from '#shared/chess/index.ts';
import type { ConceptSentences } from './concept-types.ts';
import { capitalize, definite } from './en-grammar.ts';
import type { Viewer } from './types.ts';

// The sacrifices with a name, in English: the Greek gift, the desperado, the
// exchange sacrifice.

type SacrificeConcepts = Pick<
  ConceptSentences,
  'greekGift' | 'letsGreekGift' | 'desperado' | 'exchangeSacrifice'
>;

export function sacrificesEn(viewer: Viewer): SacrificeConcepts {
  const the = (piece: Piece): string => definite(viewer, piece);
  return {
    greekGift: square => [
      `The Greek gift! The bishop takes on ${square} and tears the king’s cover open.`,
      `A classic: the bishop sacrifice on ${square}, and the knight and queen join in.`,
    ],
    letsGreekGift: reply => [
      `That allows the Greek gift: ${reply}, and the king’s cover is torn open.`,
      `The Greek gift is on: ${reply}, then the knight and queen come for the king.`,
    ],
    desperado: piece => [
      `A desperado: ${the(piece)} was lost anyway, so it takes something first.`,
      `${capitalize(the(piece))} sells itself dearly: doomed where it stood, it grabs what it can.`,
    ],
    exchangeSacrifice: piece => [
      `An exchange sacrifice: the rook for ${the(piece)}, and the position is worth it.`,
      `The rook gives itself for ${the(piece)}: an exchange sacrifice the engine likes.`,
    ],
  };
}
