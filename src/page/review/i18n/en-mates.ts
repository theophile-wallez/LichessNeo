import type { MatePattern } from '#page/review/coach/mate-pattern.ts';

// The named mates in English, each with what makes it: said after the mate.

export const MATES_EN: Readonly<Record<MatePattern, string>> = {
  backRank: 'A back-rank mate: the king’s own pawns wall it in.',
  smothered: 'A smothered mate: the king is buried under its own pieces.',
  arabian: 'The Arabian mate: the rook beside the cornered king, the knight holding it.',
  epaulette: 'An epaulette mate: the king’s own pieces on both sides block its way out.',
  corner:
    'A corner mate: the king stuck in the corner, a rook holding the file, the knight checking.',
  suffocation: 'A suffocation mate: the king’s own pieces wall it in, a bishop covers the rest.',
  boden: 'Boden’s mate: two bishops on crossing diagonals.',
  doubleBishop: 'A double bishop mate: the two bishops rake the king side by side.',
  morphy: 'Morphy’s mate: the bishop checks the cornered king, a rook holding the file beside it.',
  reti: 'Réti’s mate: the bishop checks from right beside the king, walled in by its own pieces, a rook or the queen backing it up.',
  balestra:
    'The Balestra mate: the bishop checks from afar, the queen a knight’s jump away covers the rest.',
  blackburne: 'Blackburne’s mate: two bishops and a knight close the net.',
  legal: 'Légal’s mate: two knights and a bishop, and the king is caught.',
  pawn: 'Mate by a pawn: the humblest piece has the last word.',
  anastasia:
    'Anastasia’s mate: the knight and the king’s own piece shut it in on the edge, and the check comes down the file.',
  greco:
    'Greco’s mate: the king in the corner, a bishop controlling the square beside it, the check down the edge file.',
  pillsbury:
    'Pillsbury’s mate: the check down the king’s file, a bishop on the long diagonal covering the corner.',
  hook: 'A hook mate: the rook beside the king, held by a knight, the knight by a pawn.',
  vukovic:
    'Vukovic’s mate: the rook beside the king on the edge, a knight covering the squares along it.',
  anderssen:
    'Anderssen’s mate: the rook checks from the corner along the back rank, held on the diagonal by a pawn or a bishop.',
  opera: 'The Opera mate: the rook on the back rank, the bishop holding it.',
  blindSwine: 'The blind swine mate: two rooks on the seventh, and the king has nowhere to go.',
  killBox: 'A kill box mate: the rook beside the king, the queen holding it from across the box.',
  swallowsTail:
    'A swallow’s tail mate: the queen face to face with the king, its own pieces blocking the way back.',
  dovetail:
    'A dovetail mate: the queen diagonally beside the king, its own pieces in the way of the rest.',
  triangle:
    'A triangle mate: the queen beside the king, the rook holding it, the three in a triangle.',
  damiano: 'Damiano’s mate: the queen lands beside the king, and a pawn holds it there.',
  lolli: 'Lolli’s mate: the queen right in front of the king, held by a pawn.',
  maxLange: 'Max Lange’s mate: the queen beside the king, the bishop holding it.',
  ladder: 'A ladder mate: two heavy pieces, one on the edge, the other on the line next to it.',
  scholar:
    'The Scholar’s mate: the queen takes the weak square beside the king, the bishop holding it.',
  kissOfDeath: 'The kiss of death: the queen right against the king, held by its own king.',
};
