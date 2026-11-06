import { type Square, squareCoords } from '#shared/chess/index.ts';
import { attackersOn } from '#page/review/chess/rays.ts';
import {
  coverOf,
  defendersOf,
  diagonalBeside,
  edgesOf,
  isOwn,
  type MateScene,
  neighborsOf,
  stepsTo,
} from './mate-scene.ts';

// The named mates a knight, a bishop or a pawn gives: the smothered mate, the
// corner mate (a rook or the queen holding the file beside the cornered king,
// a knight checking), suffocation (the king walled in but for what a bishop
// covers), Boden's mate and the double bishop mate (the bishops alone around
// the king, on its two sides or on one), Morphy's mate (a bishop checking the
// cornered king, a rook holding the file beside), Réti's mate (a bishop beside
// the king, its own pieces around it, a rook or the queen behind), the
// Balestra mate (a bishop checking from afar, the queen a knight's move off,
// the two alone covering the rest), and the pawn mate.

export type MinorMate =
  | 'smothered'
  | 'corner'
  | 'suffocation'
  | 'boden'
  | 'doubleBishop'
  | 'morphy'
  | 'reti'
  | 'balestra'
  | 'blackburne'
  | 'legal'
  | 'pawn';

const freeSquares = (scene: MateScene): Square[] =>
  neighborsOf(scene).filter(square => !isOwn(scene, square));

// A rook or the queen holds a square around the king, along its file or rank.
const heldByLine = (scene: MateScene): boolean =>
  freeSquares(scene).some(square =>
    attackersOn(scene.open, square, scene.mater).some(from => {
      const role = scene.open.get(from)?.role;
      const [file, rank] = stepsTo(square, from);
      return (role === 'rook' || role === 'queen') && (file === 0 || rank === 0);
    }),
  );

// A bishop beside the king, held by a knight.
const bishopHeld = ({ board, king, mater }: MateScene): boolean =>
  [...board].some(
    ([square, piece]) =>
      piece.color === mater &&
      piece.role === 'bishop' &&
      Math.max(...stepsTo(king, square).map(Math.abs)) === 1 &&
      attackersOn(board, square, mater).some(from => board.get(from)?.role === 'knight'),
  );

function knightMate(scene: MateScene): MinorMate | null {
  const free = freeSquares(scene);
  if (free.length === 0) return 'smothered';
  if (edgesOf(scene) === 2 && heldByLine(scene)) return 'corner';
  if (bishopHeld(scene)) return 'legal';
  return free.every(square => coverOf(scene, square).includes('bishop')) ? 'suffocation' : null;
}

// Two bishops around the king, one of them on each square it could go to.
function bishopPair(scene: MateScene): 'boden' | 'doubleBishop' | null {
  const { open, king, mater } = scene;
  const bishopsOn = (square: Square): Square[] =>
    attackersOn(open, square, mater).filter(from => open.get(from)?.role === 'bishop');
  const bishops = new Set([king, ...neighborsOf(scene)].flatMap(bishopsOn));
  if (bishops.size < 2 || !freeSquares(scene).every(square => bishopsOn(square).length > 0))
    return null;
  const [file] = squareCoords(king);
  const sides = new Set([...bishops].map(from => Math.sign(squareCoords(from)[0] - file)));
  return sides.has(-1) && sides.has(1) ? 'boden' : 'doubleBishop';
}

// A bishop other than the checker on a square the king could go to.
const otherBishop = (scene: MateScene): boolean =>
  freeSquares(scene).some(square =>
    attackersOn(scene.open, square, scene.mater).some(
      from => from !== scene.checker && scene.open.get(from)?.role === 'bishop',
    ),
  );

// The squares the king could go to covered by the bishop and the queen alone.
const heldByBishopAndQueen = (scene: MateScene): boolean =>
  freeSquares(scene).every(square => {
    const cover = coverOf(scene, square);
    return cover.length > 0 && cover.every(role => role === 'bishop' || role === 'queen');
  });

const knightApart = (from: Square, to: Square): boolean => {
  const [file, rank] = stepsTo(from, to);
  return Math.abs(file * rank) === 2;
};

const queenKnightApart = ({ board, king, mater }: MateScene): boolean =>
  [...board].some(
    ([square, piece]) =>
      piece.color === mater && piece.role === 'queen' && knightApart(king, square),
  );

function bishopMate(scene: MateScene): MinorMate | null {
  const pair = bishopPair(scene);
  if (pair) return pair;
  if (edgesOf(scene) === 2 && heldByLine(scene)) return 'morphy';
  const beside = diagonalBeside(scene.king, scene.checker);
  const walled = neighborsOf(scene).filter(square => isOwn(scene, square)).length >= 3;
  const backed = defendersOf(scene).some(role => role === 'rook' || role === 'queen');
  if (beside && walled && backed) return 'reti';
  if (beside && defendersOf(scene).includes('knight') && otherBishop(scene)) return 'blackburne';
  return !beside && queenKnightApart(scene) && heldByBishopAndQueen(scene) ? 'balestra' : null;
}

/** The named mate a knight, a bishop or a pawn gives on `scene`, if any. */
export function minorMate(scene: MateScene): MinorMate | null {
  if (scene.role === 'knight') return knightMate(scene);
  if (scene.role === 'bishop') return bishopMate(scene);
  return scene.role === 'pawn' ? 'pawn' : null;
}
