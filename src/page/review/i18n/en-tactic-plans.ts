import type { Piece } from '#shared/chess/index.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import { capitalize, definite, pieceName } from './en-grammar.ts';
import type { PlanSentences } from './types.ts';

// The piece a pin holds is its own side's: named once whose they are, not twice.
const bare = (piece: Piece): string => definite(null, piece);

// What a move sets up against the other side's pieces.
export function tacticPlansEn(
  the: (piece: Piece) => string,
): Pick<
  PlanSentences,
  'chases' | 'attacksPawn' | 'pins' | 'discovery' | 'fileBattery' | 'diagonalBattery'
> {
  return {
    attacksPawn: (pawn, square) => {
      const named = `${pieceName(pawn)} on ${squareToken(square)}`;
      return [
        `That attacks the undefended ${named}.`,
        `The ${named} is under attack, and nothing defends it.`,
        `The ${named} is left hanging: nothing defends it.`,
      ];
    },
    fileBattery: (mover, partner, halfOpen) => {
      const file = `the ${halfOpen ? 'half-open' : 'open'} file`;
      return [
        `${capitalize(the(mover))} lines up with ${the(partner)} on ${file}: a battery.`,
        `${capitalize(the(mover))} and ${the(partner)} form a battery on ${file}.`,
        `${capitalize(the(mover))} joins ${the(partner)} on ${file}: twice the pressure.`,
      ];
    },
    diagonalBattery: (mover, partner, target) => [
      `${capitalize(the(mover))} lines up with ${the(partner)}, aimed at ${the(target)}: a battery.`,
      `${capitalize(the(mover))} and ${the(partner)} form a battery aimed at ${the(target)}.`,
      `${capitalize(the(mover))} joins ${the(partner)} on the diagonal, both aimed at ${the(target)}.`,
    ],
    chases: (piece, square) => {
      const target = square === null ? the(piece) : `${the(piece)} on ${square}`;
      return [
        `${capitalize(target)} is under attack and has to move.`,
        `That hits ${target}, gaining time.`,
        `${capitalize(target)} has to move, gaining a tempo.`,
      ];
    },
    pins: (piece, behind) => [
      `${capitalize(the(piece))} is pinned to ${bare(behind)}.`,
      `A pin: ${the(piece)} can’t move without exposing ${bare(behind)}.`,
      `${capitalize(the(piece))} is stuck in front of ${bare(behind)}.`,
    ],
    discovery: (slider, screen, target) => {
      const blow = target.role === 'king' ? 'a discovered check' : 'a discovered attack';
      return [
        `${capitalize(the(slider))} lines up behind ${the(screen)} on ${the(target)}: once ${the(screen)} moves, that’s ${blow}.`,
        `A battery: ${the(slider)} behind ${the(screen)}, aimed at ${the(target)}.`,
        `${capitalize(the(screen))} only has to move to unleash ${the(slider)} on ${the(target)}.`,
      ];
    },
  };
}
