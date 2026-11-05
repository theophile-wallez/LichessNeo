import type { Piece } from '#shared/chess/index.ts';
import type { ConceptSentences } from './concept-types.ts';

import { capitalize, conjugate, owned, partyOf } from './fr-grammar.ts';
import { attackFr } from './fr-attack.ts';
import { sacrificesFr } from './fr-sacrifices.ts';
import { habitsFr } from './fr-habits.ts';
import { structureFr } from './fr-structure.ts';
import type { Viewer } from './types.ts';

type KingConcepts = Pick<
  ConceptSentences,
  'losesCastling' | 'blocksCheck' | 'loosensKing' | 'knightOnRim'
>;

// The chess ideas behind a move, in French.

// The king's: castling lost, a check blocked, its cover pushed; a knight on the rim.
function kingConceptsFr(viewer: Viewer): KingConcepts {
  const party = (color: Piece['color']) => partyOf(viewer, color);
  const The = (piece: Piece): string => capitalize(owned(viewer, piece));
  return {
    losesCastling: (side, line) => {
      const loser = party(side);
      const king = owned(viewer, { role: 'king', color: side });
      return [
        `${capitalize(king)} est délogé : après ${line}, ${loser.subject} ne ${conjugate(loser, 'peux', 'peut', 'peuvent')} plus roquer.`,
        `${capitalize(loser.subject)} ${conjugate(loser, 'perds', 'perd', 'perdent')} le droit de roquer : ${line}.`,
        `Plus de roque pour ${loser.object ?? 'toi'} : ${line}.`,
      ];
    },
    blocksCheck: piece => [
      `${The(piece)} s’interpose pour parer l’échec.`,
      `${The(piece)} bloque l’échec.`,
      `${The(piece)} vient couvrir l’échec.`,
    ],
    loosensKing: ['Ça affaiblit les pions devant le roi.', 'La protection du roi s’affaiblit.'],
    knightOnRim: square => [
      `Cavalier au bord, cavalier mort : en ${square}, il ne fait pas grand-chose.`,
      `Au bord de l’échiquier, en ${square}, le cavalier contrôle peu de cases.`,
    ],
  };
}

export function conceptsFr(viewer: Viewer): ConceptSentences {
  const party = (color: Piece['color']) => partyOf(viewer, color);
  return {
    ...kingConceptsFr(viewer),
    ...structureFr(viewer),
    ...habitsFr(viewer),
    ...attackFr(viewer),
    ...sacrificesFr(viewer),
    winsBishopPair: side => {
      const owner = party(side);
      return [
        `${capitalize(owner.subject)} ${conjugate(owner, 'obtiens', 'obtient', 'obtiennent')} la paire de fous.`,
        `Deux fous contre un : la paire de fous est pour ${owner.object ?? 'toi'}.`,
      ];
    },
    givesBishopPair: side => {
      const owner = party(side);
      return [
        `${capitalize(owner.subject)} ${conjugate(owner, 'gardes', 'garde', 'gardent')} la paire de fous.`,
        `Ça laisse la paire de fous ${owner.to ?? 'à toi'}.`,
      ];
    },
    badBishopOff: [
      'Un mauvais fou s’en va, gêné par ses propres pions.',
      'Le mauvais fou est échangé : ses propres pions lui barraient la route.',
    ],
    makesBadBishop: [
      'Ça enferme le fou derrière ses propres pions.',
      'Les pions bloquent leur propre fou.',
    ],
    oppositeBishops: ahead =>
      ahead
        ? [
            'Fous de couleurs opposées : gagner devient plus dur.',
            'Attention : avec des fous de couleurs opposées, un pion de plus peut ne pas suffire.',
          ]
        : [
            'Fous de couleurs opposées : la nulle se rapproche.',
            'Des fous de couleurs opposées : une finale souvent nulle.',
          ],
    doubledPawns: (side, reply, file) => {
      const owner = party(side);
      const pawns = owner.of === null ? 'tes pions' : `les pions ${owner.of}`;
      return [
        `Après ${reply}, ${pawns} sont doublés en colonne ${file}.`,
        `${reply} laisse des pions doublés en colonne ${file}.`,
      ];
    },
  };
}
