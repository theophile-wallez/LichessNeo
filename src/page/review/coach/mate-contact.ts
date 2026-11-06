import { type Role, type Square, squareCoords } from '#shared/chess/index.ts';
import { attackersOn } from '#page/review/chess/rays.ts';
import { ownRank } from './structure.ts';
import {
  coverOf,
  defendersOf,
  diagonalBeside,
  edgesOf,
  isOwn,
  type MateScene,
  neighborsOf,
  offset,
  onBackRank,
  stepsTo,
  straightBeside,
} from './mate-scene.ts';

// The named mates a rook or the queen gives from beside the king. A rook: the
// Arabian mate (the cornered king, a knight holding the rook), the hook mate
// (a knight holding the rook, a pawn the knight), Vukovic's (on the edge, a
// knight covering the squares along it), Anderssen's and the Opera mate (along
// the back rank, held by a pawn or a bishop), the blind swine (two rooks on
// the seventh), the kill box (the queen holding the rook from two squares
// off). The queen: the swallow's tail (the king's own pieces on the squares
// behind it), the dovetail (the queen alone covering the squares left free),
// the triangle (a rook beside the king holding the queen), Damiano's and
// Lolli's mates (on the back rank, held by a pawn), Max Lange's (on the edge
// file, held by a bishop), the Scholar's mate (on the f-pawn's square, held by
// a bishop), the kiss of death (held by its own king).

export type ContactMate =
  | 'arabian'
  | 'hook'
  | 'vukovic'
  | 'anderssen'
  | 'opera'
  | 'blindSwine'
  | 'killBox'
  | 'swallowsTail'
  | 'dovetail'
  | 'triangle'
  | 'damiano'
  | 'lolli'
  | 'maxLange'
  | 'scholar'
  | 'kissOfDeath';

// A knight beside the king holds the rook, and a pawn holds the knight.
function hooked({ board, king, mater, checker }: MateScene): boolean {
  return attackersOn(board, checker, mater).some(
    from =>
      board.get(from)?.role === 'knight' &&
      Math.max(...stepsTo(king, from).map(Math.abs)) === 1 &&
      attackersOn(board, from, mater).some(pawn => board.get(pawn)?.role === 'pawn'),
  );
}

// The king on one edge, the rook beside it from inside, a knight on the squares along the edge.
function vukovic(scene: MateScene): boolean {
  const { king, checker } = scene;
  const [file] = squareCoords(king);
  const [across, up] = stepsTo(king, checker);
  const fileEdge = file === 0 || file === 7;
  const along = fileEdge
    ? [offset(king, 0, 1), offset(king, 0, -1)]
    : [offset(king, 1, 0), offset(king, -1, 0)];
  const inside = fileEdge ? up === 0 : across === 0;
  const held = along.every(square => square === null || coverOf(scene, square).includes('knight'));
  return edgesOf(scene) === 1 && inside && held;
}

const cornerSquare = (square: Square): boolean =>
  squareCoords(square).every(coordinate => coordinate === 0 || coordinate === 7);

// The rook beside the king along its back rank.
const alongBackRank = (scene: MateScene): boolean =>
  onBackRank(scene) && stepsTo(scene.king, scene.checker)[1] === 0;

function blindSwine({ board, mated, mater, checker }: MateScene): boolean {
  if (ownRank(checker, mated) !== 1) return false;
  const rank = squareCoords(checker)[1];
  return [...board].some(
    ([square, piece]) =>
      square !== checker &&
      piece.color === mater &&
      piece.role === 'rook' &&
      squareCoords(square)[1] === rank,
  );
}

function killBox({ board, mater, checker }: MateScene): boolean {
  return attackersOn(board, checker, mater).some(from => {
    const [file, rank] = stepsTo(checker, from);
    return board.get(from)?.role === 'queen' && Math.abs(file) === 2 && Math.abs(rank) === 2;
  });
}

// Checked along the back rank from the corner, the checker held on a diagonal.
function anderssen(scene: MateScene, defenders: readonly Role[]): boolean {
  const corner = cornerSquare(scene.checker);
  const diagonal = defenders.some(role => role === 'pawn' || role === 'bishop');
  return alongBackRank(scene) && corner && diagonal;
}

function rookMate(scene: MateScene): ContactMate | null {
  const defenders = defendersOf(scene);
  const cornered = edgesOf(scene) === 2 || cornerSquare(scene.checker);
  if (cornered && defenders.includes('knight')) return 'arabian';
  if (hooked(scene)) return 'hook';
  if (vukovic(scene)) return 'vukovic';
  if (anderssen(scene, defenders)) return 'anderssen';
  if (alongBackRank(scene) && defenders.includes('bishop')) return 'opera';
  if (blindSwine(scene)) return 'blindSwine';
  return killBox(scene) ? 'killBox' : null;
}

// The two squares behind the king, away from the queen face to face with it, both its own.
function swallowsTail(scene: MateScene): boolean {
  const [file, rank] = stepsTo(scene.checker, scene.king);
  const behind = [
    offset(scene.king, file + rank, rank + file),
    offset(scene.king, file - rank, rank - file),
  ];
  return behind.every(square => isOwn(scene, square));
}

// The queen on a diagonal beside the king, its own pieces on the two squares
// beside it away from the queen, the queen covering the rest.
function dovetail(scene: MateScene): boolean {
  const { king, checker } = scene;
  if (edgesOf(scene) > 0) return false;
  const [file, rank] = stepsTo(king, checker);
  const walled = [offset(king, -file, 0), offset(king, 0, -rank)].every(square =>
    isOwn(scene, square),
  );
  const covered = neighborsOf(scene).every(
    square =>
      square === checker || isOwn(scene, square) || coverOf(scene, square).includes('queen'),
  );
  return walled && covered;
}

function triangle({ board, king, mater, checker }: MateScene): boolean {
  return attackersOn(board, checker, mater).some(
    from => board.get(from)?.role === 'rook' && diagonalBeside(king, from),
  );
}

// The weak square beside the uncastled king, its f-pawn's, taken by the queen a bishop holds.
function scholar({ king, checker, mated }: MateScene): boolean {
  const [file] = squareCoords(king);
  const [queenFile] = squareCoords(checker);
  return (
    ownRank(king, mated) === 0 && file === 4 && queenFile === 5 && ownRank(checker, mated) === 1
  );
}

// The queen held by a pawn on the back rank: Damiano's on the edge file,
// Lolli's in front of the castled king.
function pawnHeld(scene: MateScene, diagonal: boolean): ContactMate | null {
  if (!onBackRank(scene) || !defendersOf(scene).includes('pawn')) return null;
  const [file] = squareCoords(scene.king);
  const [queenFile] = squareCoords(scene.checker);
  if (diagonal && (queenFile === 0 || queenFile === 7)) return 'damiano';
  return queenFile === file && (file === 1 || file === 6) ? 'lolli' : null;
}

// The queen held by a pawn; by a bishop on the edge file or on the f-pawn's
// square; or by its own king, the kiss of death.
function heldQueen(scene: MateScene, diagonal: boolean): ContactMate | null {
  const held = pawnHeld(scene, diagonal);
  if (held) return held;
  const defenders = defendersOf(scene);
  const bishop = defenders.includes('bishop');
  if (bishop && scholar(scene)) return 'scholar';
  if (bishop && edgesOf(scene) === 1 && !onBackRank(scene)) return 'maxLange';
  return defenders.includes('king') ? 'kissOfDeath' : null;
}

function queenMate(scene: MateScene): ContactMate | null {
  const diagonal = diagonalBeside(scene.king, scene.checker);
  if (anderssen(scene, defendersOf(scene))) return 'anderssen';
  if (!diagonal && swallowsTail(scene)) return 'swallowsTail';
  if (diagonal && dovetail(scene)) return 'dovetail';
  if (diagonal && triangle(scene)) return 'triangle';
  return heldQueen(scene, diagonal);
}

/** The named mate a rook or the queen gives from beside the king on `scene`, if any. */
export function contactMate(scene: MateScene): ContactMate | null {
  const beside =
    straightBeside(scene.king, scene.checker) || diagonalBeside(scene.king, scene.checker);
  if (!beside || defendersOf(scene).length === 0) return null;
  if (scene.role === 'rook') return rookMate(scene);
  return scene.role === 'queen' ? queenMate(scene) : null;
}
