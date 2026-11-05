import type { Piece } from '#shared/chess/index.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import { capitalize, definite, pieceName } from './en-grammar.ts';
import type { Reason } from '#page/review/coach/idea.ts';
import type { PlanSentences } from './types.ts';

// The piece a pin holds is its own side's: named once whose they are, not twice.
const bare = (piece: Piece): string => definite(null, piece);

// What a move sets up against the other side's pieces.
export function tacticPlansEn(
  the: (piece: Piece) => string,
): Pick<
  PlanSentences,
  | 'chases'
  | 'developsWithTempo'
  | 'traps'
  | 'attacksPawn'
  | 'pins'
  | 'discovery'
  | 'fileBattery'
  | 'diagonalBattery'
> {
  return {
    ...chasesEn(the),
    attacksPawn: (pawn, square, outnumbered) => {
      const named = `${pieceName(pawn)} on ${squareToken(square)}`;
      if (outnumbered)
        return [
          `The ${named} is attacked more times than it’s defended.`,
          `Pressure on the ${named}: more attackers than defenders.`,
          `One attacker too many for the ${named}.`,
        ];
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

// A piece attacked, maybe with nowhere to go.
function chasesEn(
  the: (piece: Piece) => string,
): Pick<PlanSentences, 'chases' | 'developsWithTempo' | 'traps'> {
  return {
    chases: (piece, square) => {
      const target = square === null ? the(piece) : `${the(piece)} on ${square}`;
      return [
        `${capitalize(target)} is under attack and has to move.`,
        `That hits ${target}, gaining time.`,
        `A tempo gained: ${target} has to move.`,
      ];
    },
    developsWithTempo: (piece, target, square) => {
      const hit = square === null ? the(target) : `${the(target)} on ${square}`;
      return [
        `Development with tempo: ${the(piece)} comes out and hits ${hit}.`,
        `${capitalize(the(piece))} joins the game with a gain of time: ${hit} has to move.`,
      ];
    },
    traps: (piece, square) => {
      const target = square === null ? the(piece) : `${the(piece)} on ${square}`;
      return [
        `${capitalize(target)} is trapped: it has nowhere to go.`,
        `That traps ${target}: no safe square left.`,
      ];
    },
  };
}

// A piece nothing defends isn't only chased: it's there to be taken.
export function chaseWhyEn(
  reason: Extract<Reason, { readonly kind: 'chases' }>,
  piece: string,
): string {
  const on = reason.square ? ` on ${reason.square}` : '';
  if (reason.trapped) return `trapping ${piece}${on}`;
  if (reason.undefended) return `attacking the undefended ${pieceName(reason.piece)}${on}`;
  return `gaining a tempo on ${piece}${on}`;
}

export function pawnWhyEn({
  piece,
  square,
  outnumbered,
}: Extract<Reason, { kind: 'attacksPawn' }>): string {
  const named = `${pieceName(piece)} on ${squareToken(square)}`;
  return outnumbered ? `piling up on the ${named}` : `attacking the undefended ${named}`;
}
