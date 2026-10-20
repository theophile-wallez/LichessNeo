import type { Piece } from '#shared/chess/index.ts';
import type { MotifKind } from '#page/review/chess/motifs.ts';
import { capitalize, definite, pairOf } from './en-grammar.ts';
import type { MotifNamer, Viewer, Ways } from './types.ts';

// The piece a pin holds is its own side's: named once whose they are, not twice.
const bare = (piece: Piece): string => definite(null, piece);

// The tactic that wins the material along a line, named after its move:
// "16. Qc7+ forks the king and the rook."

type MotifSentence = (move: string, first: Piece, second: Piece | undefined) => Ways | null;
type MotifSentences = Readonly<Record<MotifKind, MotifSentence>>;

// Tactics that attack: a fork, a pin, a skewer, a discovered attack.
function attacksEn(
  viewer: Viewer,
): Pick<MotifSentences, 'fork' | 'pin' | 'skewer' | 'discoveredAttack'> {
  const the = (piece: Piece): string => definite(viewer, piece);
  const The = (piece: Piece): string => capitalize(the(piece));
  return {
    fork: (move, first, second) => {
      if (!second) return null;
      const both = pairOf(viewer, first, second);
      return [
        `${move} forks ${both}.`,
        `${move} is a fork, on ${both}.`,
        `A fork with ${move}, on ${both}.`,
      ];
    },
    // A pin isn't always its move's doing: the pinned piece can't take back.
    pin: (_move, first, second) =>
      second
        ? [
            `${The(first)} is pinned to ${bare(second)}.`,
            `${The(first)} is stuck, pinned to ${bare(second)}.`,
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
  const the = (piece: Piece): string => definite(viewer, piece);
  const The = (piece: Piece): string => capitalize(the(piece));
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
  return (kind: MotifKind, move: string, pieces: readonly Piece[]): Ways | null => {
    const [first, second] = pieces;
    return first ? sentences[kind](move, first, second) : null;
  };
}
