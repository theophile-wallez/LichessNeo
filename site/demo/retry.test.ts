import { describe, expect, it } from 'vitest';
import { moveOn, pickedOn, RETRY_START, type RetryState } from './retry.ts';
import { moves } from './review.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// 6... Nf6, Black's first mistake: the engine had 6... Qf6.
const mistake = moves[11];

describe('a move clicked on the board', () => {
  it('pushes a pawn one square, or two from its first rank', () => {
    expect(moveOn(START, 'e2', 'e3')).toBe('e2e3');
    expect(moveOn(START, 'e2', 'e4')).toBe('e2e4');
    expect(moveOn(START, 'e2', 'e5')).toBeNull();
  });

  it('takes diagonally with a pawn only where there is a piece', () => {
    expect(moveOn(START, 'e2', 'd3')).toBeNull();
    expect(moveOn('4k3/8/8/8/8/3p4/4P3/4K3 w - - 0 1', 'e2', 'd3')).toBe('e2d3');
  });

  it('is the side to move’s, onto a square that isn’t its own', () => {
    expect(moveOn(START, 'e7', 'e5')).toBeNull();
    expect(moveOn(START, 'g1', 'f3')).toBe('g1f3');
    expect(moveOn(START, 'g1', 'e2')).toBeNull();
  });

  it('leaves its own king out of check', () => {
    expect(moveOn('4k3/4r3/8/8/8/8/4B3/4K3 w - - 0 1', 'e2', 'd3')).toBeNull();
  });

  it('promotes a pawn to a queen', () => {
    expect(moveOn('8/P6k/8/8/8/8/8/K7 w - - 0 1', 'a7', 'a8')).toBe('a7a8q');
  });
});

describe('Retry’s clicks', () => {
  if (!mistake) throw new Error('the demo has no 6th move');

  const play = (from: 'd8' | 'g8', to: 'f6' | 'h6'): RetryState =>
    pickedOn(mistake, pickedOn(mistake, RETRY_START, from), to);

  it('picks a piece of the side to move, then plays it', () => {
    expect(pickedOn(mistake, RETRY_START, 'd8').picked).toBe('d8');
    expect(play('d8', 'f6').outcome).toEqual({ kind: 'found', uci: 'd8f6', san: 'Qf6' });
  });

  it('tells the move played in the game from another wrong one', () => {
    expect(play('g8', 'f6').outcome).toEqual({ kind: 'same', uci: 'g8f6' });
    expect(play('g8', 'h6').outcome).toEqual({ kind: 'wrong', uci: 'g8h6', san: 'Nh6' });
  });

  it('picks nothing on an empty square or the other side’s piece', () => {
    expect(pickedOn(mistake, RETRY_START, 'e4')).toBe(RETRY_START);
    expect(pickedOn(mistake, pickedOn(mistake, RETRY_START, 'g8'), 'f3').picked).toBeNull();
  });

  it('takes no more clicks once a move is played', () => {
    const played = play('d8', 'f6');
    expect(pickedOn(mistake, played, 'g8')).toBe(played);
  });
});
