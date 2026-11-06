import { attractionAt } from './attraction.ts';
import { clearanceAt, interferenceAt } from './interference.ts';
import type { Move } from './line-win.ts';
import type { Detector } from './motifs.ts';
import type { Ply } from './played-line.ts';
import { xrayAt } from './xray.ts';

// The motifs that work along a line, for motifs.ts: an x-ray, a big piece
// lured onto a square, a defender's line cut, a line cleared for a slider.

export type LinesKind = 'xray' | 'attraction' | 'interference' | 'clearance';

const plyList = (moves: readonly Move[]): Ply[] => moves.map(move => move.ply);

/** The winner lands on a square, is taken there, and a slider takes back through the taker. */
export const xray: Detector = ({ moves, capture }, i) => {
  const found = i === capture - 2 ? xrayAt(plyList(moves), i) : null;
  if (!found) return null;
  const pieces = [found.slider, found.screen];
  return { kind: 'xray', ply: i, pieces, at: [found.from, found.through] };
};

/** The winner's move `i` lures a big piece onto a square, struck at once. */
export const attraction: Detector = ({ moves, capture }, i) => {
  const found = i < capture ? attractionAt(plyList(moves), i) : null;
  return found ? { kind: 'attraction', ply: i, pieces: [found.piece], at: [found.square] } : null;
};

/** The winner's move `i` steps between the target and its defender. */
export const interference: Detector = ({ moves, capture }, i) => {
  const found = i === capture - 2 ? interferenceAt(plyList(moves), i) : null;
  return found ? { kind: 'interference', ply: i, pieces: [found.defender, found.target] } : null;
};

/** The winner's move `i` clears a line for a slider of its own. */
export const clearance: Detector = ({ moves, capture }, i) => {
  const slider = i <= capture - 2 ? clearanceAt(plyList(moves), i) : null;
  return slider ? { kind: 'clearance', ply: i, pieces: [slider] } : null;
};
