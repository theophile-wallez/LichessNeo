import type { Piece } from '#shared/chess/index.ts';
import type { SquarePlan, SquareReason } from '#page/review/coach/idea.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import { capitalize, toThe } from './fr-grammar.ts';
import type { QuietPlanSentences } from './plan-types.ts';

// A square taken from a piece, a wing's majority pushed, a king cut off, a
// zugzwang, a fianchetto, a bishop's retreat, a blockade, in French.

const COUNTS = ['aucun', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit'];
const count = (pawns: number): string => COUNTS[pawns] ?? String(pawns);
const wing = (queenside: boolean): string => (queenside ? 'l’aile dame' : 'l’aile roi');

export function squarePlansFr(the: (piece: Piece) => string): Pick<QuietPlanSentences, SquarePlan> {
  return {
    prevents: (piece, square, target, pin) => {
      const kept = `la case ${squareToken(square)} ${toThe(the(piece))}`;
      return pin
        ? [
            `Ça interdit ${kept}, qui y clouerait ${the(target)}.`,
            `Pas de clouage sur ${the(target)} : ${the(piece)} ne peut plus venir en ${squareToken(square)}.`,
            `Prophylaxie : ça interdit ${kept}, et ${the(target)} reste libre.`,
          ]
        : [
            `Ça interdit ${kept}, qui y attaquerait ${the(target)}.`,
            `Prophylaxie : ça interdit ${kept}, et ${the(target)} reste tranquille.`,
          ];
    },
    majority: (queenside, mine, theirs) => [
      `La majorité de ${wing(queenside)} avance : ${count(mine)} pions contre ${count(theirs)}, un pion passé en vue.`,
      `${capitalize(count(mine))} contre ${count(theirs)} sur ${wing(queenside)} : cette majorité peut faire naître un pion passé.`,
    ],
    cutsOff: file => [
      `La tour coupe le roi sur la colonne ${file}.`,
      `Le roi est coupé : il ne peut plus franchir la colonne ${file}.`,
      `Une tour sur la colonne ${file}, et le roi reste enfermé de l’autre côté.`,
    ],
    zugzwang: [
      'Zugzwang : le moindre coup lâche quelque chose.',
      'Zugzwang ! Chaque coup possible cède quelque chose.',
      'Passer suffirait, mais aux échecs on ne passe pas : zugzwang.',
    ],
    fianchetto: fianchettoWays(the),
    pawnBreak: (square, base, king) => {
      if (king)
        return [
          `Le centre s’ouvre alors que le roi est encore en ${squareToken(king)} : les lignes s’ouvrent contre lui.`,
          `Une rupture au centre alors que le roi est encore en ${squareToken(king)} : il faut ouvrir les lignes.`,
        ];
      return base
        ? [
            `Une rupture : le pion frappe ${squareToken(square)}, à la base de la chaîne.`,
            `La chaîne de pions est attaquée à sa base, en ${squareToken(square)}.`,
          ]
        : [
            `Une rupture : le pion conteste le pion ${squareToken(square)}.`,
            `Un levier contre ${squareToken(square)} : la chaîne de pions est prise à partie.`,
          ];
    },
    storm: file => [
      `L’assaut de pions est lancé : le pion ${file} marche sur le roi.`,
      `Roques opposés : le pion ${file} part à l’assaut.`,
    ],
    blockades: (piece, pawn) => [
      `${capitalize(the(piece))} bloque le pion ${squareToken(pawn)} : le pion est figé, et aucun pion ne peut chasser le cavalier.`,
      `Le bloqueur idéal : ${the(piece)} se pose juste devant le pion ${squareToken(pawn)}.`,
    ],
    makesRetreat: (piece, square) => [
      `Ça libère ${squareToken(square)} pour ${the(piece)} : s’il est chassé, il pourra s’y replier.`,
      `${capitalize(the(piece))} a une case de retraite : ${squareToken(square)} est libre.`,
    ],
  };
}

// A fianchetto, by what its bishop meets down the long diagonal.
function fianchettoWays(the: (piece: Piece) => string): QuietPlanSentences['fianchetto'] {
  return (piece, aim) => {
    if (aim?.kind === 'target') {
      const aimed =
        aim.target.role === 'pawn'
          ? squareToken(aim.square)
          : `${the(aim.target)} en ${squareToken(aim.square)}`;
      return [
        `Un fianchetto, et ${the(piece)} vise déjà ${aimed}.`,
        `${capitalize(the(piece))} prend la grande diagonale et vise ${aimed} de loin.`,
      ];
    }
    if (aim?.kind === 'held' && aim.lever)
      return [
        `Un fianchetto face au pion ${squareToken(aim.square)}, solide pour l’instant : un pion en ${squareToken(aim.lever)} viendra le contester.`,
        `${capitalize(the(piece))} vise ${squareToken(aim.square)}, bien tenu pour l’instant, en attendant un pion en ${squareToken(aim.lever)}.`,
      ];
    if (aim?.kind === 'held')
      return [
        `Un fianchetto, mais ${the(piece)} mord sur du granit : ${squareToken(aim.square)} est solidement défendu.`,
        `Le pion ${squareToken(aim.square)} est bien tenu : la diagonale reste fermée pour ${the(piece)}.`,
      ];
    if (aim?.kind === 'behind')
      return [
        `Un fianchetto derrière le pion ${squareToken(aim.square)} : ${the(piece)} attend que la diagonale s’ouvre.`,
      ];
    return [
      `Un fianchetto : ${the(piece)} sur la grande diagonale.`,
      `${capitalize(the(piece))} se place en fianchetto, braqué sur la grande diagonale.`,
    ];
  };
}

/** Why a move was played, after « qui » : « Mieux valait h3, qui interdisait la case g4 au fou ». */
export function squareWhyFr(
  the: (piece: Piece) => string,
): (reason: SquareReason, now: boolean) => string {
  return (reason, now) => {
    const tense = (past: string, present: string): string => (now ? present : past);
    if (reason.kind === 'prevents')
      return `${tense('interdisait', 'interdit')} la case ${squareToken(reason.square)} ${toThe(the(reason.piece))}`;
    if (reason.kind === 'majority')
      return `${tense('poussait', 'pousse')} la majorité de ${wing(reason.queenside)}`;
    if (reason.kind === 'cutsOff')
      return `${tense('coupait', 'coupe')} le roi sur la colonne ${reason.file}`;
    if (reason.kind === 'zugzwang') return `${tense('mettait', 'met')} l’adversaire en zugzwang`;
    if (reason.kind === 'pawnBreak')
      return reason.king
        ? `${tense('ouvrait', 'ouvre')} le centre sur le roi resté en ${squareToken(reason.king)}`
        : `${tense('frappait', 'frappe')} la chaîne en ${squareToken(reason.square)}`;
    if (reason.kind === 'storm')
      return `${tense('lançait', 'lance')} le pion ${reason.file} à l’assaut`;
    if (reason.kind === 'blockades')
      return `${tense('bloquait', 'bloque')} le pion ${squareToken(reason.pawn)} avec ${the(reason.piece)}`;
    if (reason.kind === 'makesRetreat')
      return `${tense('libérait', 'libère')} ${squareToken(reason.square)} pour ${the(reason.piece)}`;
    return `${tense('plaçait', 'place')} ${the(reason.piece)} en fianchetto`;
  };
}
