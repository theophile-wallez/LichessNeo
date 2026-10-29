import { describe, expect, it } from 'vitest';
import { bestLine, explainParts, fenAfter } from './explain.ts';
import { navState, toggled } from './nav.ts';
import { RETRY_START } from './retry.ts';
import { moves } from './review.ts';
import { en } from '#page/review/i18n/en.ts';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// 6... Nf6, a mistake, and 7. Qb3, the engine's own move.
const mistake = moves[11] ?? null;
const best = moves[12] ?? null;

const enabled = (state: ReturnType<typeof navState>) => ({
  explain: state.explain.enabled,
  best: state.best.enabled,
  retry: state.retry.enabled,
  next: state.next.enabled,
});

describe('the card’s buttons', () => {
  it('all show on a mistake', () => {
    expect(enabled(navState(mistake, { kind: 'comment', line: null }, true))).toEqual({
      explain: true,
      best: true,
      retry: true,
      next: true,
    });
  });

  it('fold away on the engine’s own move, but Next', () => {
    expect(enabled(navState(best, { kind: 'comment', line: null }, true))).toEqual({
      explain: false,
      best: false,
      retry: false,
      next: true,
    });
  });

  it('keep Retry and Next only while retrying, so nothing gives the answer away', () => {
    const state = navState(mistake, { kind: 'retry', retry: RETRY_START }, false);
    expect(enabled(state)).toEqual({ explain: false, best: false, retry: true, next: true });
    expect(state.retry.on).toBe(true);
  });

  it('turn their view on, and back to the comment when it is on', () => {
    expect(toggled({ kind: 'comment', line: null }, 'retry')).toEqual({
      kind: 'retry',
      retry: RETRY_START,
    });
    expect(toggled({ kind: 'best' }, 'best')).toEqual({ kind: 'comment', line: null });
    expect(toggled({ kind: 'best' }, 'explain')).toEqual({ kind: 'explain', line: null });
  });
});

describe('Explain', () => {
  if (!mistake) throw new Error('the demo has no 6th move');

  it('plays the engine’s line from its best move', () => {
    expect(bestLine(mistake)?.[0]).toBe('d8f6');
  });

  it('gives the best line, then the one that punishes the mistake', () => {
    const parts = explainParts(mistake, en);
    expect(parts).toHaveLength(2);
    expect(parts[1]?.droppable).toBe(true);
  });

  it('puts the position a line leads to on the board', () => {
    expect(fenAfter(START, [])).toBe(START);
    expect(fenAfter(START, ['e2e4', 'e7e5'])).toBe(
      'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w - - 0 1',
    );
  });
});
