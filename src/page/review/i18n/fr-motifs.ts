import type { Piece } from '#shared/chess/index.ts';
import type { MotifKind } from '#page/review/chess/motifs.ts';
import { agreement, capitalize, materialFr, owned, subjectPronoun } from './fr-grammar.ts';
import type { MotifNamer, Viewer } from './types.ts';

// The tactic that wins the material along a line, named after its move:
// « 16. Dc7+ fait une fourchette sur le roi et la tour. »

type MotifSentence = (move: string, first: Piece, second: Piece | undefined) => string | null;

/** "au roi", "à la dame", "à ta tour". */
const toThe = (named: string): string =>
  named.startsWith('le ') ? `au ${named.slice(3)}` : `à ${named}`;

export function motifFr(viewer: Viewer): MotifNamer {
  const the = (piece: Piece): string => owned(viewer, piece);
  const sentences: Readonly<Record<MotifKind, MotifSentence>> = {
    fork: (move, first, second) => {
      if (!second) return null;
      // Two of a kind: "deux tours".
      const both =
        first.role === second.role ? materialFr({ won: [first, second], lost: [] }) : null;
      return `${move} fait une fourchette sur ${both ?? `${the(first)} et ${the(second)}`}.`;
    },
    pin: (_move, first, second) =>
      second
        ? `${capitalize(the(first))} est cloué${agreement(first)} ${toThe(the(second))}.`
        : null,
    skewer: (move, first, second) =>
      second ? `${move} prend ${the(first)} en enfilade, et ${the(second)} tombe derrière.` : null,
    discoveredAttack: (move, first) => `${move} découvre une attaque sur ${the(first)}.`,
    discoveredCheck: (move, _king, won) =>
      won ? `${move} est un échec à la découverte, et ${the(won)} tombe.` : null,
    doubleCheck: (move, _king, won) =>
      won ? `${move} est un échec double, et ${the(won)} tombe.` : null,
    capturingDefender: (move, first, second) =>
      second ? `${move} prend ${the(first)}, qui défendait ${the(second)}.` : null,
    trappedPiece: (_move, first) =>
      `${capitalize(the(first))} est pris${agreement(first)} au piège : ${subjectPronoun(first)} n’a plus de case.`,
    hangingPiece: (_move, first) => `${capitalize(the(first))} était sans défense.`,
  };
  return (kind, move, pieces) => {
    const [first, second] = pieces;
    return first ? sentences[kind](move, first, second) : null;
  };
}
