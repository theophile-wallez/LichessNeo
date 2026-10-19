import { remarksEn } from './en-remarks.ts';
import type { RemarkPools } from './types.ts';

// The remarks on the opponent's moves, for a reader who played the game: no
// cheering, no advice. Errors keep the reader's pools: the comment never
// remarks on one (coach/explanation.ts).

export const theirRemarksEn: RemarkPools = {
  ...remarksEn,
  brilliant: [
    'The opponent sacrifices material, and it works.',
    'A bold sacrifice from the opponent, and a sound one.',
    'The kind of move people remember.',
    'Few players would dare to play this.',
  ],
  great: [
    'The opponent finds the only good move.',
    'The only move that holds everything together.',
    'A critical moment, handled perfectly.',
    'Precise. Nothing else holds here.',
  ],
  best: [
    'Exactly what the engine wanted.',
    'The opponent finds the engine’s top move.',
    'Couldn’t have done better.',
    'Spot on.',
    'That’s the most accurate move.',
    'Clean and precise.',
    'Precise play from the opponent.',
    'Nothing better here.',
    'Strong and simple.',
  ],
  excellent: [
    'Very close to the best move.',
    'A strong move that keeps things under control.',
    'Very good. The engine barely disagrees.',
    'Almost perfect.',
    'A sensible, strong continuation.',
    'Solid play from the opponent.',
  ],
  mate: [
    'Checkmate! Game over.',
    'And that’s mate: the opponent wins.',
    'The king has nowhere to go. Mate!',
    'Checkmate: that ends the game.',
  ],
  mating: [
    'The mating net tightens.',
    'The opponent closes in on the king.',
    'One step closer to checkmate.',
    'No escape for the king now.',
  ],
  castle: [
    'Castling: king safe, rook in the game.',
    'The opponent tucks the king away.',
    'The rooks can now connect.',
    'Castled, and the king is safe.',
  ],
  check: [
    'A check that keeps the initiative.',
    'Forcing play: checks are powerful.',
    'Check, and the king has to answer.',
    'A check to keep the pressure on.',
  ],
  winning: [
    'The opponent is winning now.',
    'The position is winning for the opponent.',
    'The opponent only has to convert.',
    'Winning for the opponent now.',
  ],
  defending: [
    'A hard position for the opponent, who keeps fighting.',
    'The opponent is in trouble, but resists.',
    'The opponent hangs on.',
  ],
};
