import type { Piece } from '#shared/chess/index.ts';
import {
  isLineReason,
  isPlain,
  type LineReason,
  type PlainReason,
  type Reason,
} from '#page/review/coach/idea.ts';
import { squareToken } from '#page/review/comment/tokens.ts';
import { indefiniteOn, owned, pairOf, pieceName } from './fr-grammar.ts';
import type { Viewer } from './types.ts';

// Why a move was, or is, played, as a clause after its name: the better move's
// reason, or the reply's (fr-plans.ts).

// The piece a pin holds is its own side's: named once whose they are, not twice.
const bare = (piece: Piece): string => owned(null, piece);

// Each reason as the better move's, in the past, and as a move still to come.
const PLAIN_REASONS: Readonly<Record<PlainReason, readonly [string, string]>> = {
  doublesRooks: ['doublait les tours', 'double les tours'],
  seventhRank: ['mettait la tour en septième rangée', 'met la tour en septième rangée'],
  connectsRooks: ['reliait les tours', 'relie les tours'],
  centralKing: ['centralisait le roi', 'centralise le roi'],
  center: ['prenait le centre', 'prend le centre'],
  fightsCenter: ['disputait le centre', 'dispute le centre'],
  supportsCenter: ['soutenait le centre', 'soutient le centre'],
  castles: ['mettait le roi à l’abri', 'met le roi à l’abri'],
  behindPasser: ['plaçait la tour derrière le pion passé', 'place la tour derrière le pion passé'],
  luft: ['donnait de l’air au roi', 'donne de l’air au roi'],
  space: ['gagnait de l’espace', 'gagne de l’espace'],
  opposition: ['prenait l’opposition', 'prend l’opposition'],
  checks: ['donnait échec', 'donne échec'],
  discoveredCheck: ['donnait un échec à la découverte', 'donne un échec à la découverte'],
};

type PieceReason = Extract<Reason, { readonly piece: Piece }>;
type Tense = (past: string, present: string) => string;

function pieceWhy(reason: PieceReason, the: (piece: Piece) => string, tense: Tense): string {
  const piece = the(reason.piece);
  if (reason.kind === 'develops') return `${tense('sortait', 'sort')} ${piece}`;
  if (reason.kind === 'outpost')
    return `${tense('installait', 'installe')} ${piece} sur un avant-poste`;
  if (reason.kind === 'chases')
    return `${tense('attaquait', 'attaque')} ${piece}${reason.square ? ` en ${reason.square}` : ''}`;
  if (reason.kind === 'attacksPawn')
    return `${tense('attaquait', 'attaque')} le ${pieceName(reason.piece)} ${squareToken(reason.square)}, que rien ne ${tense('défendait', 'défend')}`;
  if (reason.kind === 'pins')
    return `${tense('clouait', 'cloue')} ${piece} sur ${bare(reason.behind)}`;
  if (reason.kind === 'saves') return `${tense('mettait', 'met')} ${piece} à l’abri`;
  if (reason.kind === 'guards')
    return `${tense('protégeait', 'protège')} ${piece}${reason.square ? ` en ${reason.square}` : ''}`;
  if (reason.kind === 'centralizes') return `${tense('centralisait', 'centralise')} ${piece}`;
  return takesWhy(reason, piece, tense);
}

// A capture, its piece by its square when it's one of several: « prend le [pion] a5 ».
function takesWhy(reason: PieceReason, piece: string, tense: Tense): string {
  const square = 'square' in reason && typeof reason.square === 'string' ? reason.square : null;
  const named = square === null ? piece : indefiniteOn(reason.piece, square);
  if (reason.kind === 'takesWith') return `${tense('prenait', 'prend')} plutôt avec ${named}`;
  return `${tense('prenait', 'prend')} ${named}`;
}

type TacticReason = Extract<Reason, { readonly kind: 'discovery' | 'doubleThreat' | 'fork' }>;

function tacticWhy(reason: TacticReason, viewer: Viewer, tense: Tense): string {
  const the = (piece: Piece): string => owned(viewer, piece);
  if (reason.kind === 'fork')
    return `${tense('faisait', 'fait')} une fourchette sur ${pairOf(viewer, reason.first, reason.second)}`;
  if (reason.kind === 'doubleThreat')
    return `${tense('menaçait', 'menace')} à la fois le mat et ${the(reason.target)}, et un seul des deux ${tense('pouvait', 'peut')} être paré`;
  return reason.target.role === 'king'
    ? `${tense('préparait', 'prépare')} un échec à la découverte`
    : `${tense('préparait', 'prépare')} une attaque à la découverte sur ${the(reason.target)}`;
}

// An open file taken, or a battery: with the queen there already, a rook
// lines up with it rather than taking the file.
function lineWhy(reason: LineReason, the: (piece: Piece) => string, tense: Tense): string {
  const forms = tense('formait', 'forme');
  if (reason.kind === 'diagonalBattery')
    return `${forms} une batterie avec ${the(reason.partner)}, braquée sur ${the(reason.target)}`;
  const file = `la colonne ${reason.halfOpen ? 'semi-ouverte' : 'ouverte'}`;
  if (reason.kind === 'fileBattery')
    return `${forms} une batterie avec ${the(reason.partner)} sur ${file}`;
  if (reason.kind === 'preparesBattery')
    return `${tense('préparait', 'prépare')} une batterie avec ${the(reason.partner)} sur ${file}`;
  return reason.contested
    ? `${tense('contestait', 'conteste')} ${file}`
    : `${tense('prenait', 'prend')} ${file}`;
}

// What a move did, after « qui » : « Mieux valait Cf6, qui sortait ton cavalier » ;
// or does, for a move still to come : « Ça permet Fe2, qui attaque ton cavalier ».
export function whyFr(viewer: Viewer): (reason: Reason, now?: boolean) => string {
  const the = (piece: Piece): string => owned(viewer, piece);
  const why = (reason: Reason, now = false): string => {
    const tense: Tense = (past, present) => (now ? present : past);
    if (isPlain(reason)) return tense(...PLAIN_REASONS[reason.kind]);
    if (reason.kind === 'both') return `${why(reason.first, now)} et ${why(reason.second, now)}`;
    if (reason.kind === 'discovery' || reason.kind === 'doubleThreat' || reason.kind === 'fork')
      return tacticWhy(reason, viewer, tense);
    if ('piece' in reason) return pieceWhy(reason, the, tense);
    if (isLineReason(reason)) return lineWhy(reason, the, tense);
    if (reason.kind === 'passedPawn')
      return reason.made
        ? tense('créait un pion passé', 'crée un pion passé')
        : tense('poussait le pion passé', 'pousse le pion passé');
    if (reason.kind === 'attacksKing')
      return `${tense('lançait', 'lance')} l’attaque contre ${the(reason.king)}`;
    if (reason.kind === 'outruns')
      return `${tense('filait', 'file')} à la promotion : ${the(reason.king)} ${tense('ne pouvait', 'ne peut')} plus le rattraper`;
    if (reason.kind === 'entersSquare')
      return `${tense('faisait', 'fait')} entrer ${the(reason.king)} dans le carré du pion`;
    return `${tense('gagnait', 'gagne')} ${reason.material}`;
  };
  return why;
}
