import type { Piece } from '#shared/chess/index.ts';
import type { ConceptSentences } from './concept-types.ts';
import { agreement, capitalize, owned } from './fr-grammar.ts';
import type { Viewer } from './types.ts';

// The sacrifices with a name, in French: the Greek gift, the desperado, the
// exchange sacrifice.

type SacrificeConcepts = Pick<
  ConceptSentences,
  'greekGift' | 'letsGreekGift' | 'desperado' | 'exchangeSacrifice'
>;

export function sacrificesFr(viewer: Viewer): SacrificeConcepts {
  const the = (piece: Piece): string => owned(viewer, piece);
  return {
    greekGift: square => [
      `Le sacrifice grec ! Le fou prend en ${square} et ouvre le roi.`,
      `Un classique : le fou se sacrifie en ${square}, et le cavalier et la dame suivent.`,
    ],
    letsGreekGift: reply => [
      `Ça permet le sacrifice grec : ${reply}, et le roi est mis à nu.`,
      `Le sacrifice grec est possible : ${reply}, puis le cavalier et la dame viennent chercher le roi.`,
    ],
    desperado: piece => [
      `Un desperado : ${the(piece)} était perdu${agreement(piece)} de toute façon, alors autant prendre quelque chose.`,
      `${capitalize(the(piece))} vend chèrement sa peau : condamné${agreement(piece)}, autant emporter quelque chose.`,
    ],
    exchangeSacrifice: piece => [
      `Un sacrifice de qualité : la tour contre ${the(piece)}, et la position le vaut bien.`,
      `La tour se donne pour ${the(piece)} : un sacrifice de qualité que le moteur approuve.`,
    ],
  };
}
