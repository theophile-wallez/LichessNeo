import { describe, expect, it } from 'vitest';
import type { Reason } from './idea.ts';
import { freshTold, sayOnce } from './told.ts';

const BISHOP = { role: 'bishop', color: 'white' } as const;
const chase: Reason = { kind: 'chases', piece: BISHOP, square: '[[s:h4]]' };

describe('sayOnce', () => {
  it('says a reason told on a move just before no more', () => {
    const before = freshTold();
    expect(sayOnce(before, chase, 'g7g5', 'gaining a tempo')).toBe('gaining a tempo');
    expect(sayOnce(freshTold(before.now), chase, 'g7g5', 'gaining a tempo')).toBeNull();
  });

  it('says a piece chased before is now trapped', () => {
    const before = freshTold();
    sayOnce(before, chase, 'g7g5', 'gaining a tempo');
    const trap: Reason = { ...chase, trapped: true };
    expect(sayOnce(freshTold(before.now), trap, 'g7g5', 'trapping the bishop')).toBe(
      'trapping the bishop',
    );
  });
});
