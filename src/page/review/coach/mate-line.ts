import { type Square, squareCoords } from '#shared/chess/index.ts';
import { attackersOn } from '#page/review/chess/rays.ts';
import {
  checksStraight,
  coverOf,
  edgesOf,
  isOwn,
  type MateScene,
  neighborsOf,
  offset,
  onBackRank,
  stepsTo,
  straightBeside,
} from './mate-scene.ts';
import { ownRank } from './structure.ts';

// The named mates a rook or the queen gives along a line: the back-rank mate
// (the king's own pawns wall it in, on its back rank or an edge file),
// Anastasia's (on the edge file, a knight covering the squares the king's own
// piece leaves), Greco's (the cornered king checked down the edge file from
// afar, a bishop covering the square beside), Pillsbury's (the castled king
// checked down the knight's file, a bishop covering the corner), the ladder
// (two heavy pieces on the edge and the line next to it), the epaulette mate
// (the king's own pieces on its two sides).

export type LineMate = 'backRank' | 'anastasia' | 'greco' | 'pillsbury' | 'ladder' | 'epaulette';

// The squares in front of a king on an edge, from inside the board: along its
// back rank, or along an edge file.
function frontOf(scene: MateScene): Square[] | null {
  const { king, mated, checker } = scene;
  const [across, along] = stepsTo(king, checker);
  if (onBackRank(scene) && along === 0)
    return neighborsOf(scene).filter(square => ownRank(square, mated) === 1);
  const [file] = squareCoords(king);
  if ((file !== 0 && file !== 7) || across !== 0) return null;
  const inward = file === 0 ? 1 : 6;
  return neighborsOf(scene).filter(square => squareCoords(square)[0] === inward);
}

// The king on an edge, its back rank mostly, checked along it, the squares in
// front of it held by its own pieces, pawns two of them at least, or empty and
// covered: no piece of the other side's there.
function backRank(scene: MateScene): boolean {
  const { board, mater } = scene;
  const front = frontOf(scene);
  if (!front) return false;
  const pawns = front.filter(square => board.get(square)?.role === 'pawn' && isOwn(scene, square));
  const shut = front.every(
    square =>
      isOwn(scene, square) || (!board.has(square) && attackersOn(board, square, mater).length > 0),
  );
  return pawns.length >= 2 && shut;
}

// On the edge file, checked down it, its own piece beside it, a knight on the squares beyond.
function anastasia(scene: MateScene): boolean {
  const { king } = scene;
  const [file, rank] = squareCoords(king);
  if ((file !== 0 && file !== 7) || rank === 0 || rank === 7) return false;
  const inward = file === 0 ? 1 : -1;
  const beyond = [offset(king, inward, 1), offset(king, inward, -1)];
  const held = beyond.every(square => square !== null && coverOf(scene, square).includes('knight'));
  return stepsTo(king, scene.checker)[0] === 0 && isOwn(scene, offset(king, inward, 0)) && held;
}

// Checked down its own file from afar, and a bishop on a free square of its back rank beside it.
function bishopOnRank(scene: MateScene): boolean {
  const { king, checker } = scene;
  const down = stepsTo(king, checker)[0] === 0 && !straightBeside(king, checker);
  const beside = [offset(king, 1, 0), offset(king, -1, 0)];
  return (
    down &&
    beside.some(
      square =>
        square !== null && !isOwn(scene, square) && coverOf(scene, square).includes('bishop'),
    )
  );
}

// The cornered king, its pawn in front, checked down the edge file, a bishop on the square beside.
const greco = (scene: MateScene): boolean => edgesOf(scene) === 2 && bishopOnRank(scene);

// The castled king on the knight's file, checked down it, a bishop covering the corner beside it.
function pillsbury(scene: MateScene): boolean {
  const [file] = squareCoords(scene.king);
  return onBackRank(scene) && (file === 1 || file === 6) && bishopOnRank(scene);
}

// Two heavy pieces on the edge and the line next to it: one checks, the other holds.
function ladder(scene: MateScene): boolean {
  const { board, mater, checker } = scene;
  const front = frontOf(scene);
  if (!front || edgesOf(scene) === 0) return false;
  return front.every(square =>
    attackersOn(scene.open, square, mater).some(from => {
      const role = board.get(from)?.role;
      return from !== checker && (role === 'rook' || role === 'queen');
    }),
  );
}

// Checked along a line, the king's two neighbors across it its own.
function epaulette(scene: MateScene): boolean {
  const [file] = stepsTo(scene.king, scene.checker);
  const flanks =
    file === 0
      ? [offset(scene.king, 1, 0), offset(scene.king, -1, 0)]
      : [offset(scene.king, 0, 1), offset(scene.king, 0, -1)];
  return scene.role === 'queen' && flanks.every(square => isOwn(scene, square));
}

const linePiece = (scene: MateScene): boolean =>
  (scene.role === 'rook' || scene.role === 'queen') && checksStraight(scene);

/** The back-rank or the epaulette mate on `scene`: the king walled in by its own pieces. */
export function walledMate(scene: MateScene): 'backRank' | 'epaulette' | null {
  if (!linePiece(scene)) return null;
  if (backRank(scene)) return 'backRank';
  return epaulette(scene) ? 'epaulette' : null;
}

/** The named mate a rook or the queen gives along a line on `scene`, if any. */
export function lineMate(scene: MateScene): LineMate | null {
  if (!linePiece(scene)) return null;
  if (anastasia(scene)) return 'anastasia';
  if (greco(scene)) return 'greco';
  if (pillsbury(scene)) return 'pillsbury';
  return ladder(scene) ? 'ladder' : null;
}
