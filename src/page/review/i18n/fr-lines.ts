import type { Color, Piece } from '#shared/chess/index.ts';
import {
  capitalize,
  conjugate,
  materialFr,
  owned,
  partyOf,
  type Party,
  says,
  soon,
  within,
} from './fr-grammar.ts';
import { motifFr } from './fr-motifs.ts';
import type { LineFacts, Viewer } from './types.ts';

// The sentences read off the engine's lines: what a line wins, and the threats.

type GainSentences = Pick<LineFacts, 'forcesMate' | 'losesMaterial' | 'wouldHaveWon' | 'winsAlong'>;

function gainsFr(viewer: Viewer): GainSentences {
  const party = (color: Color): Party => partyOf(viewer, color);
  return {
    forcesMate: (color, line) => [
      `${says(party(color), 'peux', 'peut', 'peuvent')} maintenant forcer le mat : ${line}.`,
      `Un mat forcé se profile : ${line}.`,
      `Le mat est inévitable : ${line}.`,
    ],
    losesMaterial: (color, { material, line, moves }, threatened) => {
      const winner = party(color);
      const wins = `${winner.subject} ${conjugate(winner, 'gagnes', 'gagne', 'gagnent')} ${material} ${within(moves)}`;
      if (threatened)
        return [
          `La menace reste entière, et ${wins} : ${line}.`,
          `La menace n’est pas parée, et ${wins} : ${line}.`,
        ];
      return [
        `${capitalize(wins)} : ${line}.`,
        `${line} : ${wins}.`,
        `Ça coûte ${material} ${within(moves)} : ${line}.`,
      ];
    },
    wouldHaveWon: (color, { material, line, moves }) => [
      `Le mieux était de gagner ${material} ${soon(moves)} : ${line}.`,
      `${says(party(color), 'pouvais', 'pouvait', 'pouvaient')} gagner ${material} ${soon(moves)} : ${line}.`,
      `L’occasion de gagner ${material} ${soon(moves)} : ${line}.`,
    ],
    winsAlong: ({ material, line, moves }) => [
      `De quoi gagner ${material} ${soon(moves)} : ${line}.`,
      `${capitalize(material)} à la clé ${soon(moves)} : ${line}.`,
      `Le coup rapporte ${material} ${soon(moves)} : ${line}.`,
      `Ça gagne ${material} ${soon(moves)} : ${line}.`,
    ],
  };
}

type ThreatSentences = Pick<
  LineFacts,
  'stopsThreat' | 'stopsMate' | 'stopsLongMate' | 'escapes' | 'threatens' | 'threatensMate'
>;

function threatsFr(viewer: Viewer): ThreatSentences {
  const the = (piece: Piece): string => capitalize(owned(viewer, piece));
  return {
    stopsThreat: (threat, material) => [
      `Ça empêche ${threat}, qui aurait gagné ${material}.`,
      `Plus de ${threat}, qui aurait gagné ${material}.`,
      `La menace ${threat} est écartée : elle aurait gagné ${material}.`,
      `Bien vu : ${threat} aurait gagné ${material}.`,
    ],
    stopsMate: line => [
      `Le mat est paré : ${line}.`,
      `La menace de mat est écartée : ${line}.`,
      `Ça empêche le mat : ${line}.`,
    ],
    stopsLongMate: (moves, first) => [
      `Ça pare un mat en ${moves}, qui commence par ${first}.`,
      `Fini le mat en ${moves} qui commençait par ${first}.`,
      `Un mat en ${moves} se préparait, à commencer par ${first} : le voilà paré.`,
    ],
    escapes: (piece, threat) => [
      `${the(piece)} se met à l’abri de ${threat}.`,
      `${the(piece)} échappe à ${threat}.`,
      `${the(piece)} esquive ${threat}.`,
      `${the(piece)} se dérobe juste à temps à ${threat}.`,
    ],
    threatens: (threat, material) => [
      `La menace : ${threat} au coup suivant, qui gagnerait ${material}.`,
      `Au coup suivant, ${threat} gagnerait ${material}.`,
      `${threat} se prépare, et gagnerait ${material}.`,
      `En vue : ${threat}, pour gagner ${material}.`,
    ],
    threatensMate: (threat, moves) =>
      moves <= 1
        ? [
            `Menace de mat au coup suivant : ${threat}.`,
            `${threat} serait mat au coup suivant.`,
            `Un mat en un coup menace : ${threat}.`,
          ]
        : [
            `Menace de mat ${within(moves)}, à commencer par ${threat}.`,
            `Un mat ${within(moves)} se prépare, à commencer par ${threat}.`,
            `L’attaque menace un mat ${within(moves)}, avec ${threat} pour commencer.`,
          ],
  };
}

export const lineFactsFr = (viewer: Viewer): LineFacts => ({
  motif: motifFr(viewer),
  material: materialFr,
  ...gainsFr(viewer),
  ...threatsFr(viewer),
});
