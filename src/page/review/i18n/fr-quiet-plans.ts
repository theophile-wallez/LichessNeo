import type { Piece, Square } from '#shared/chess/index.ts';
import { isSquarePlan } from '#page/review/coach/idea.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import { agreement, capitalize, indefiniteOn, pieceName } from './fr-grammar.ts';
import type { QuietPlanSentences, QuietWhy } from './plan-types.ts';
import { squarePlansFr, squareWhyFr } from './fr-square-plans.ts';

// A king's walk in an ending, a line opened, a piece backed up, a pinned one
// piled up on, the queens' trade.

const passed = (pawn: Piece, square: Square): string =>
  `${pieceName(pawn)} passé ${squareToken(square)}`;

const LINES = { file: 'la colonne', rank: 'la rangée', diagonal: 'la diagonale' } as const;

const target = (the: (piece: Piece) => string, piece: Piece, square: string | null): string =>
  square === null ? the(piece) : `${the(piece)} en ${square}`;

// « le [cavalier] d4, cloué, », « la [tour] e5, clouée, ».
const pinned = (piece: Piece, square: Square): string =>
  `${indefiniteOn(piece, squareToken(square))}, cloué${agreement(piece)},`;

export function quietPlansFr(the: (piece: Piece) => string): QuietPlanSentences {
  return {
    ...squarePlansFr(the),
    escorts: (pawn, square) => [
      `Le roi vient escorter le ${passed(pawn, square)}.`,
      `Roi et pion passé main dans la main : le ${passed(pawn, square)} a son escorte.`,
      `Le roi marche aux côtés du ${passed(pawn, square)}, pour lui ouvrir la route.`,
    ],
    stopsPasser: (pawn, square) => [
      `Le roi vient barrer la route au ${passed(pawn, square)}.`,
      `Le ${passed(pawn, square)} ne filera pas : le roi est là.`,
      `Le roi se dresse sur le chemin du ${passed(pawn, square)}.`,
    ],
    opensLine: (slider, line) => [
      `Ça ouvre ${LINES[line]} pour ${the(slider)}.`,
      `${capitalize(the(slider))} a le champ libre sur ${LINES[line]}.`,
      `La voie est libre : ${the(slider)} voit loin sur ${LINES[line]}.`,
    ],
    backs: (piece, square) => [
      `Le pion soutient ${target(the, piece, square)}.`,
      `${capitalize(target(the, piece, square))} a maintenant un pion dans son dos.`,
      `${capitalize(target(the, piece, square))}, attaqué${agreement(piece)}, reçoit le soutien d’un pion.`,
    ],
    hitsPinned: (piece, square) => [
      `${capitalize(pinned(piece, square))} est attaqué${agreement(piece)} une fois de plus.`,
      `${capitalize(pinned(piece, square))} a un attaquant de trop.`,
      `${capitalize(pinned(piece, square))} a maintenant plus d’attaquants que de défenseurs.`,
    ],
    queenTrade: declined =>
      declined
        ? [
            'La dame esquive l’échange : quand on est derrière, on garde les dames.',
            'Pas d’échange des dames : en retard de matériel, la dame garde le combat vivant.',
          ]
        : [
            'La dame propose l’échange : avec du matériel en plus, chaque échange aide.',
            'En avance de matériel ? Échange les dames !',
            'La dame s’offre à l’échange : moins de pièces, une victoire plus simple.',
          ],
  };
}

/** Why a move was played, after « qui » : « Mieux valait Rf5, qui escortait le pion passé f4 ». */
export function quietWhyFr(the: (piece: Piece) => string): QuietWhy {
  const square = squareWhyFr(the);
  return (reason, now) => {
    if (isSquarePlan(reason)) return square(reason, now);
    const tense = (past: string, present: string): string => (now ? present : past);
    if (reason.kind === 'escorts')
      return `${tense('escortait', 'escorte')} le ${passed(reason.pawn, reason.square)}`;
    if (reason.kind === 'stopsPasser')
      return `${tense('barrait', 'barre')} la route au ${passed(reason.pawn, reason.square)}`;
    if (reason.kind === 'opensLine')
      return `${tense('ouvrait', 'ouvre')} ${LINES[reason.line]} pour ${the(reason.slider)}`;
    if (reason.kind === 'backs')
      return `${tense('soutenait', 'soutient')} ${target(the, reason.piece, reason.square ?? null)} d’un pion`;
    if (reason.kind === 'hitsPinned')
      return `${tense('attaquait', 'attaque')} encore ${indefiniteOn(reason.piece, squareToken(reason.square))}, cloué${agreement(reason.piece)}`;
    return reason.declined
      ? tense('gardait les dames', 'garde les dames')
      : tense('proposait l’échange des dames', 'propose l’échange des dames');
  };
}
