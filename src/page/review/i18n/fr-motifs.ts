import type { Piece } from '#shared/chess/index.ts';
import type { MotifKind } from '#page/review/chess/motifs.ts';
import {
  isPressureKind,
  PRESSURE_PIECES,
  type PressureKind,
} from '#page/review/chess/motifs-pressure.ts';
import {
  agreement,
  capitalize,
  ofThe,
  owned,
  ownedOn,
  pairOf,
  subjectPronoun,
} from './fr-grammar.ts';
import type { MotifNamer, Named, PressureNamer, Viewer, Ways } from './types.ts';

// The piece a pin holds is its own side's: named once whose they are, not twice.
const bare = (piece: Piece): string => owned(null, piece);

// The tactic that wins the material along a line, named after its move:
// « 16. Dc7+ fait une fourchette sur le roi et la tour. »

/** "au roi", "à la dame", "à ta tour". */
const toThe = (named: string): string =>
  named.startsWith('le ') ? `au ${named.slice(3)}` : `à ${named}`;

type MotifSentence = (move: string, first: Named, second: Named | undefined) => Ways | null;
type MotifSentences = Readonly<
  Record<Exclude<MotifKind, 'pinnedDefender' | PressureKind>, MotifSentence>
>;

// Tactics that attack: a fork, a pin, a skewer, a discovered attack.
function attacksFr(
  viewer: Viewer,
): Pick<MotifSentences, 'fork' | 'pin' | 'skewer' | 'discoveredAttack'> {
  const the = (named: Named): string => ownedOn(viewer, named);
  const The = (named: Named): string => capitalize(the(named));
  return {
    fork: (move, first, second) => {
      if (!second) return null;
      const both = pairOf(viewer, first.piece, second.piece);
      return [
        `${move} fait une fourchette sur ${both}.`,
        `Fourchette avec ${move}, sur ${both}.`,
        `${move} attaque à la fois ${both}.`,
      ];
    },
    pin: (_move, first, second) =>
      second
        ? [
            `${The(first)} est cloué${agreement(first.piece)} ${toThe(bare(second.piece))}.`,
            `${The(first)} ne peut plus bouger : ${bare(second.piece)} est derrière.`,
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
  const the = (named: Named): string => ownedOn(viewer, named);
  const The = (named: Named): string => capitalize(the(named));
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
            `${move} élimine le défenseur, ${the(first)}, et ${the(second)} n’est plus protégé${agreement(second.piece)}.`,
          ]
        : null,
    trappedPiece: (_move, first) => [
      `${The(first)} est pris${agreement(first.piece)} au piège : ${subjectPronoun(first.piece)} n’a plus de case.`,
      `${The(first)} est enfermé${agreement(first.piece)}, sans aucune case de fuite.`,
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
    // Said apart, plainly then square by square (coach/motif-fact.ts).
    if (kind === 'pinnedDefender' || isPressureKind(kind)) return null;
    const [first, second] = pieces;
    return first ? sentences[kind](move, first, second) : null;
  };
}

/** « du [pion] e5 », « de la [tour] », « de ton [fou] ». */
type PressureSentence = (move: string, first: Named, second: Named) => Ways;

// The pressure that wins it, each piece by its square when it's one of several.
function pressureSentences(viewer: Viewer): Readonly<Record<PressureKind, PressureSentence>> {
  const the = (named: Named): string => ownedOn(viewer, named);
  const The = (named: Named): string => capitalize(the(named));
  return {
    deflection: (move, defender, target) => [
      `${move} détourne ${the(defender)}, et ${the(target)} tombe.`,
      `${capitalize(the(defender))} est surchargé${agreement(defender.piece)} : après ${move}, impossible de reprendre et de garder ${the(target)} à la fois.`,
      `Après ${move}, ${the(defender)} reprend et abandonne ${the(target)}.`,
    ],
    chasedDefender: (move, defender, target) => [
      `${move} chasse ${the(defender)}, et ${the(target)} perd son défenseur.`,
      `${move} éloigne ${the(defender)} ${ofThe(the(target))}.`,
    ],
    doubleAttack: (move, first, second) => [
      `${move} attaque à la fois ${the(first)} et ${the(second)}.`,
      `Double attaque avec ${move}, sur ${the(first)} et ${the(second)}.`,
    ],
    outnumbered: (_move, target) => [
      `${The(target)} est plus attaqué${agreement(target.piece)} que défendu${agreement(target.piece)}.`,
      `Plus d’attaquants que de défenseurs pour ${the(target)}.`,
      `Un attaquant de trop pour ${the(target)}.`,
    ],
    attacked: (move, target) => [
      `${move} s’en prend ${toThe(the(target))}, qui finit par tomber.`,
      `${move} attaque ${the(target)}, et ${subjectPronoun(target.piece)} tombe.`,
    ],
  };
}

export function pressureFr(viewer: Viewer): PressureNamer {
  const sentences = pressureSentences(viewer);
  return (kind, move, pieces) => {
    const [first, second] = pieces;
    if (!first || pieces.length < PRESSURE_PIECES[kind]) return null;
    return sentences[kind](move, first, second ?? first);
  };
}
