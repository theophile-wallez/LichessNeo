import type { Piece } from '#shared/chess/index.ts';
import type { MotifKind } from '#page/review/chess/motifs.ts';
import { agreement, capitalize, owned, pairOf, subjectPronoun } from './fr-grammar.ts';
import type { MotifNamer, Viewer, Ways } from './types.ts';

// The piece a pin holds is its own side's: named once whose they are, not twice.
const bare = (piece: Piece): string => owned(null, piece);

// The tactic that wins the material along a line, named after its move:
// « 16. Dc7+ fait une fourchette sur le roi et la tour. »

type MotifSentence = (move: string, first: Piece, second: Piece | undefined) => Ways | null;
type MotifSentences = Readonly<Record<MotifKind, MotifSentence>>;

/** "au roi", "à la dame", "à ta tour". */
const toThe = (named: string): string =>
  named.startsWith('le ') ? `au ${named.slice(3)}` : `à ${named}`;

// Tactics that attack: a fork, a pin, a skewer, a discovered attack.
function attacksFr(
  viewer: Viewer,
): Pick<MotifSentences, 'fork' | 'pin' | 'skewer' | 'discoveredAttack'> {
  const the = (piece: Piece): string => owned(viewer, piece);
  const The = (piece: Piece): string => capitalize(the(piece));
  return {
    fork: (move, first, second) => {
      if (!second) return null;
      const both = pairOf(viewer, first, second);
      return [
        `${move} fait une fourchette sur ${both}.`,
        `Fourchette avec ${move}, sur ${both}.`,
        `${move} attaque à la fois ${both}.`,
      ];
    },
    pin: (_move, first, second) =>
      second
        ? [
            `${The(first)} est cloué${agreement(first)} ${toThe(bare(second))}.`,
            `${The(first)} ne peut plus bouger : ${bare(second)} est derrière.`,
          ]
        : null,
    skewer: (move, first, second) =>
      second
        ? [
            `${move} prend ${the(first)} en enfilade, et ${the(second)} tombe derrière.`,
            `Enfilade avec ${move} : ${the(first)} s’écarte, et ${the(second)} tombe.`,
          ]
        : null,
    discoveredAttack: (move, first) => [
      `${move} découvre une attaque sur ${the(first)}.`,
      `Attaque à la découverte avec ${move}, sur ${the(first)}.`,
    ],
  };
}

// Tactics that win a piece: checks that uncover, a defender taken, a piece trapped or loose.
function strikesFr(
  viewer: Viewer,
): Omit<MotifSentences, 'fork' | 'pin' | 'skewer' | 'discoveredAttack'> {
  const the = (piece: Piece): string => owned(viewer, piece);
  const The = (piece: Piece): string => capitalize(the(piece));
  return {
    discoveredCheck: (move, _king, won) =>
      won
        ? [
            `${move} est un échec à la découverte, et ${the(won)} tombe.`,
            `Échec à la découverte avec ${move} : ${the(won)} tombe.`,
          ]
        : null,
    doubleCheck: (move, _king, won) =>
      won
        ? [
            `${move} est un échec double, et ${the(won)} tombe.`,
            `Échec double avec ${move} : ${the(won)} tombe.`,
          ]
        : null,
    capturingDefender: (move, first, second) =>
      second
        ? [
            `${move} prend ${the(first)}, qui défendait ${the(second)}.`,
            `${move} élimine le défenseur, ${the(first)}, et ${the(second)} n’est plus protégé${agreement(second)}.`,
          ]
        : null,
    trappedPiece: (_move, first) => [
      `${The(first)} est pris${agreement(first)} au piège : ${subjectPronoun(first)} n’a plus de case.`,
      `${The(first)} est enfermé${agreement(first)}, sans aucune case de fuite.`,
    ],
    hangingPiece: (_move, first) => [
      `${The(first)} était sans défense.`,
      `Rien ne protégeait ${the(first)}.`,
    ],
  };
}

export function motifFr(viewer: Viewer): MotifNamer {
  const sentences: MotifSentences = { ...attacksFr(viewer), ...strikesFr(viewer) };
  return (kind, move, pieces) => {
    const [first, second] = pieces;
    return first ? sentences[kind](move, first, second) : null;
  };
}
