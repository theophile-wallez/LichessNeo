import type { Piece } from '#shared/chess/index.ts';
import type { MotifKind } from '#page/review/chess/motifs.ts';
import { capitalize, definite, materialEn } from './en-grammar.ts';
import type { MotifNamer, Viewer } from './types.ts';

// The tactic that wins the material along a line, named after its move:
// "16. Qc7+ forks the king and the rook."

type MotifSentence = (move: string, first: Piece, second: Piece | undefined) => string | null;

export function motifEn(viewer: Viewer): MotifNamer {
  const the = (piece: Piece): string => definite(viewer, piece);
  const sentences: Readonly<Record<MotifKind, MotifSentence>> = {
    fork: (move, first, second) => {
      if (!second) return null;
      // Two of a kind: "forks two rooks".
      const both =
        first.role === second.role ? materialEn({ won: [first, second], lost: [] }) : null;
      return `${move} forks ${both ?? `${the(first)} and ${the(second)}`}.`;
    },
    // A pin isn't always its move's doing: the pinned piece can't take back.
    pin: (_move, first, second) =>
      second ? `${capitalize(the(first))} is pinned to ${the(second)}.` : null,
    skewer: (move, first, second) =>
      second ? `${move} skewers ${the(first)}, and ${the(second)} behind it falls.` : null,
    discoveredAttack: (move, first) => `${move} uncovers an attack on ${the(first)}.`,
    discoveredCheck: (move, _king, won) =>
      won ? `${move} is a discovered check, and ${the(won)} falls.` : null,
    doubleCheck: (move, _king, won) =>
      won ? `${move} is a double check, and ${the(won)} falls.` : null,
    capturingDefender: (move, first, second) =>
      second ? `${move} takes ${the(first)}, which defended ${the(second)}.` : null,
    trappedPiece: (_move, first) => `${capitalize(the(first))} is trapped: it has nowhere to go.`,
    hangingPiece: (_move, first) => `${capitalize(the(first))} was left undefended.`,
  };
  return (kind: MotifKind, move: string, pieces: readonly Piece[]): string | null => {
    const [first, second] = pieces;
    return first ? sentences[kind](move, first, second) : null;
  };
}
