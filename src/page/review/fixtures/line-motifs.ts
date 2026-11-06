// Lines won by a motif along a line, each from its position: for the motifs'
// tests and those of the coach's drawings of them.

export const LINES = {
  // The bishop takes on c6; the rook that takes back is seen through by the rook on h6.
  xray: ['6k1/8/2nr3R/1B6/8/8/8/6K1 w - - 0 1', 'b5c6 d6c6 h6c6'],
  // The knight steps in front of the rook that defends the bishop, with check.
  interference: ['4r3/6k1/8/3P4/3Nb3/8/8/4R1K1 w - - 0 1', 'd4e6 g7g6 e1e4'],
  // The knight leaves d5 with check, and the queen comes through onto the rook.
  clearance: ['r5k1/6pp/8/3N4/8/8/8/3Q2K1 w - - 0 1', 'd5e7 g8h8 d1d5 h7h6 d5a8'],
  // The rook is given up on h8 to bring the king onto the knight's fork.
  attraction: ['3q2k1/5pp1/8/6N1/8/8/8/K6R w - - 0 1', 'h1h8 g8h8 g5f7 h8g8 f7d8'],
} as const;
