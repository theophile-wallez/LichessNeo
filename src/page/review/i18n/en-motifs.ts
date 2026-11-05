import type { Piece } from '#shared/chess/index.ts';
import type { MotifKind } from '#page/review/chess/motifs.ts';
import {
  isPressureKind,
  PRESSURE_PIECES,
  type PressureKind,
} from '#page/review/chess/motifs-pressure.ts';
import { capitalize, definite, definiteOn, pairOf } from './en-grammar.ts';
import type { MotifNamer, Named, PressureNamer, Viewer, Ways } from './types.ts';

// The piece a pin holds is its own side's: named once whose they are, not twice.
const bare = (piece: Piece): string => definite(null, piece);

// The tactic that wins the material along a line, named after its move:
// "16. Qc7+ forks the king and the rook."

type MotifSentence = (move: string, first: Named, second: Named | undefined) => Ways | null;
type MotifSentences = Readonly<
  Record<Exclude<MotifKind, 'pinnedDefender' | PressureKind>, MotifSentence>
>;

// Tactics that attack: a fork, a pin, a skewer, a discovered attack.
function attacksEn(
  viewer: Viewer,
): Pick<MotifSentences, 'fork' | 'pin' | 'skewer' | 'discoveredAttack'> {
  const the = (named: Named): string => definiteOn(viewer, named);
  const The = (named: Named): string => capitalize(the(named));
  return {
    fork: (move, first, second) => {
      if (!second) return null;
      const both = pairOf(viewer, first.piece, second.piece);
      return [
        `${move} forks ${both}.`,
        `${move} is a fork of ${both}.`,
        `A fork with ${move}, hitting ${both}.`,
      ];
    },
    // A pin isn't always its move's doing: the pinned piece can't take back.
    pin: (_move, first, second) =>
      second
        ? [
            `${The(first)} is pinned to ${bare(second.piece)}.`,
            `${The(first)} is stuck, pinned to ${bare(second.piece)}.`,
          ]
        : null,
    skewer: (move, first, second) =>
      second
        ? [
            `${move} skewers ${the(first)}, and ${the(second)} behind it falls.`,
            `A skewer with ${move}: ${the(first)} moves, and ${the(second)} falls.`,
          ]
        : null,
    discoveredAttack: (move, first) => [
      `${move} uncovers an attack on ${the(first)}.`,
      `A discovered attack with ${move}, on ${the(first)}.`,
    ],
  };
}

// Tactics that win a piece: checks that uncover, a defender taken, a piece trapped or loose.
function strikesEn(
  viewer: Viewer,
): Omit<MotifSentences, 'fork' | 'pin' | 'skewer' | 'discoveredAttack'> {
  const the = (named: Named): string => definiteOn(viewer, named);
  const The = (named: Named): string => capitalize(the(named));
  return {
    discoveredCheck: (move, _king, won) =>
      won
        ? [
            `${move} is a discovered check, and ${the(won)} falls.`,
            `Discovered check with ${move}, and ${the(won)} goes.`,
          ]
        : null,
    doubleCheck: (move, _king, won) =>
      won
        ? [
            `${move} is a double check, and ${the(won)} falls.`,
            `Double check with ${move}: ${the(won)} falls.`,
          ]
        : null,
    capturingDefender: (move, first, second) =>
      second
        ? [
            `${move} takes ${the(first)}, which defended ${the(second)}.`,
            `${move} removes the defender, ${the(first)}, and ${the(second)} is loose.`,
          ]
        : null,
    trappedPiece: (_move, first) => [
      `${The(first)} is trapped: it has nowhere to go.`,
      `${The(first)} is caught, with no square to run to.`,
    ],
    hangingPiece: (_move, first) => [
      `${The(first)} was left undefended.`,
      `Nothing protected ${the(first)}.`,
    ],
  };
}

export function motifEn(viewer: Viewer): MotifNamer {
  const sentences: MotifSentences = { ...attacksEn(viewer), ...strikesEn(viewer) };
  return (kind, move, pieces) => {
    // Said apart, plainly then square by square (coach/motif-fact.ts).
    if (kind === 'pinnedDefender' || isPressureKind(kind)) return null;
    const [first, second] = pieces;
    return first ? sentences[kind](move, first, second) : null;
  };
}

type PressureSentence = (move: string, first: string, second: string) => Ways;

// The pressure that wins it, each piece by its square when it's one of several.
const PRESSURE: Readonly<Record<PressureKind, PressureSentence>> = {
  deflection: (move, defender, target) => [
    `${move} lures ${defender} away, and ${target} falls.`,
    `${capitalize(defender)} is overloaded: after ${move} it can’t take back and guard ${target} at once.`,
    `After ${move}, ${defender} takes back and no longer guards ${target}.`,
  ],
  chasedDefender: (move, defender, target) => [
    `${move} chases off ${defender}, and ${target} loses its guard.`,
    `${move} drives ${defender} away from ${target}.`,
  ],
  doubleAttack: (move, first, second) => [
    `${move} hits ${first} and ${second} at once.`,
    `A double attack with ${move}, on ${first} and ${second}.`,
  ],
  outnumbered: (_move, target) => [
    `${capitalize(target)} is attacked more times than it’s defended.`,
    `${capitalize(target)} has more attackers than defenders.`,
    `One attacker too many for ${target}.`,
  ],
  attacked: (move, target) => [
    `${move} goes after ${target}, and it falls.`,
    `${move} attacks ${target}, which soon drops.`,
  ],
};

export function pressureEn(viewer: Viewer): PressureNamer {
  const the = (named: Named): string => definiteOn(viewer, named);
  return (kind, move, pieces) => {
    const [first, second] = pieces;
    if (!first || pieces.length < PRESSURE_PIECES[kind]) return null;
    return PRESSURE[kind](move, the(first), the(second ?? first));
  };
}
