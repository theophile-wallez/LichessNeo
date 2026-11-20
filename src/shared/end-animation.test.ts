import { beforeEach, describe, expect, it } from 'vitest';
import {
  endAnimation,
  endResults,
  GameEndSchema,
  keepEndAnimation,
  keepEndResults,
  playsAfter,
} from './end-animation.ts';
import { StorageKey } from './storage.ts';
import { blockStorage } from './testing/storage.ts';

beforeEach(() => {
  localStorage.clear();
});

describe('the end animation kept for the page world', () => {
  it('reads as the settings last kept it, the wave until they have', () => {
    expect(endAnimation()).toBe('wave');
    keepEndAnimation('confetti');
    expect(localStorage.getItem(StorageKey.endAnimation)).toBe('confetti');
    expect(endAnimation()).toBe('confetti');
    localStorage.setItem(StorageKey.endAnimation, 'fireworks');
    expect(endAnimation()).toBe('wave');
  });

  it('reads as the wave from a storage the browser blocks', () => {
    blockStorage();
    expect(endAnimation()).toBe('wave');
  });
});

const plays = (results: 'win' | 'notLoss' | 'all'): boolean[] =>
  (['win', 'draw', 'loss'] as const).map(result => playsAfter(results, result));

describe('the results it plays after', () => {
  it('read as kept, a win only until then or from a storage the browser blocks', () => {
    expect(endResults()).toBe('win');
    keepEndResults('notLoss');
    expect(endResults()).toBe('notLoss');
    blockStorage();
    expect(endResults()).toBe('win');
  });

  it('always take a win, a draw when not lost, a loss with every game', () => {
    expect(plays('win')).toEqual([true, false, false]);
    expect(plays('notLoss')).toEqual([true, true, false]);
    expect(plays('all')).toEqual([true, true, true]);
  });
});

describe('a game’s end, as the page world says it', () => {
  it('names a square of the board, or none', () => {
    expect(GameEndSchema.safeParse({ result: 'draw', square: 'e4' }).success).toBe(true);
    expect(GameEndSchema.safeParse({ result: 'draw', square: null }).success).toBe(true);
    expect(GameEndSchema.safeParse({ result: 'draw', square: 'z9' }).success).toBe(false);
    expect(GameEndSchema.safeParse({ result: 'abort', square: null }).success).toBe(false);
  });
});
