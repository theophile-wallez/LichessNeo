import type { Piece } from '#shared/chess/index.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import { agreement, capitalize, owned, pieceName, subjectPronoun } from './fr-grammar.ts';
import type { PlanSentences } from './types.ts';

// The piece a pin holds is its own side's: named once whose they are, not twice.
const bare = (piece: Piece): string => owned(null, piece);

// What a move sets up against the other side's pieces.
export function tacticPlansFr(
  the: (piece: Piece) => string,
): Pick<
  PlanSentences,
  'chases' | 'attacksPawn' | 'pins' | 'discovery' | 'fileBattery' | 'diagonalBattery'
> {
  return {
    attacksPawn: (pawn, square) => {
      const named = `${pieceName(pawn)} ${squareToken(square)}`;
      return [
        `Ça attaque le ${named}, que rien ne défend.`,
        `Le ${named} est attaqué, et rien ne le défend.`,
        `Le ${named} est en prise : rien ne le défend.`,
      ];
    },
    fileBattery: (mover, partner, halfOpen) => {
      const file = `la colonne ${halfOpen ? 'semi-ouverte' : 'ouverte'}`;
      return [
        `${capitalize(the(mover))} s’aligne avec ${the(partner)} sur ${file} : une batterie.`,
        `${capitalize(the(mover))} et ${the(partner)} forment une batterie sur ${file}.`,
        `${capitalize(the(mover))} rejoint ${the(partner)} sur ${file} : deux fois plus de pression.`,
      ];
    },
    diagonalBattery: (mover, partner, target) => [
      `${capitalize(the(mover))} s’aligne avec ${the(partner)}, braqué${agreement(mover)} sur ${the(target)} : une batterie.`,
      `${capitalize(the(mover))} et ${the(partner)} forment une batterie braquée sur ${the(target)}.`,
      `${capitalize(the(mover))} rejoint ${the(partner)} sur la diagonale, tous deux braqués sur ${the(target)}.`,
    ],
    chases: (piece, square) => {
      const target = square === null ? the(piece) : `${the(piece)} en ${square}`;
      return [
        `${capitalize(target)} est attaqué${agreement(piece)} et doit bouger.`,
        `Ça attaque ${target}, avec gain de temps.`,
        `${capitalize(target)} doit bouger : du temps de gagné.`,
      ];
    },
    pins: (piece, behind) => [
      `${capitalize(the(piece))} est cloué${agreement(piece)} sur ${bare(behind)}.`,
      `Un clouage : ${the(piece)} ne peut plus bouger sans exposer ${bare(behind)}.`,
      `${capitalize(the(piece))} est coincé${agreement(piece)} devant ${bare(behind)}.`,
    ],
    discovery: (slider, screen, target) => {
      const blow = target.role === 'king' ? 'échec à la découverte' : 'une attaque à la découverte';
      return [
        `${capitalize(the(slider))} se place derrière ${the(screen)}, braqué${agreement(slider)} sur ${the(target)} : dès qu’${subjectPronoun(screen)} bougera, ce sera ${blow}.`,
        `Une batterie se forme : ${the(slider)} derrière ${the(screen)}, sur ${the(target)}.`,
        `${capitalize(the(screen))} n’a plus qu’à bouger pour découvrir ${the(slider)} sur ${the(target)}.`,
      ];
    },
  };
}
