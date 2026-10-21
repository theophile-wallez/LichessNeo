import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMateSound, isMate, type MateSoundOptions } from './mate.ts';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
});

afterEach(() => {
  vi.useRealTimers();
});

const mateSound = (options: Partial<MateSoundOptions> = {}) => {
  const falls: unknown[] = [];
  const mate = createMateSound({
    has: () => true,
    play: volume => falls.push(volume),
    lastMoveAt: () => Date.now(),
    ...options,
  });
  return { mate, falls };
};

describe('isMate', () => {
  it('tells a mate from a check by its SAN', () => {
    expect(isMate('Qxf7#')).toBe(true);
    expect(isMate('Qxf7+')).toBe(false);
    expect(isMate('e4')).toBe(false);
  });
});

describe('createMateSound', () => {
  it('plays a beat after the move’s sound has played out', async () => {
    const { mate, falls } = mateSound();
    const { promise, resolve } = Promise.withResolvers<void>();
    mate.mated(0.5, promise);
    await vi.advanceTimersByTimeAsync(2000);
    expect(falls).toEqual([]);
    resolve();
    await vi.advanceTimersByTimeAsync(249);
    expect(falls).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(falls).toEqual([0.5]);
  });

  it('plays even when the move’s sound failed', async () => {
    const { mate, falls } = mateSound();
    mate.mated(1, Promise.reject(new Error('no audio')));
    await vi.advanceTimersByTimeAsync(250);
    expect(falls).toEqual([1]);
  });

  it('counts a move sound’s length from when it played, when its end can’t be awaited', async () => {
    const movedAt = Date.now();
    const { mate, falls } = mateSound({ lastMoveAt: () => movedAt });
    await vi.advanceTimersByTimeAsync(100);
    mate.mated(1);
    await vi.advanceTimersByTimeAsync(449);
    expect(falls).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(falls).toEqual([1]);
  });

  it('quiets the game’s end for a while after a mate, or one on its way', async () => {
    const { mate } = mateSound();
    expect(mate.ended()).toBe(false);
    mate.expect();
    expect(mate.ended()).toBe(true);
    await vi.advanceTimersByTimeAsync(3000);
    expect(mate.ended()).toBe(false);
    mate.mated(1, Promise.resolve());
    await vi.advanceTimersByTimeAsync(2999);
    expect(mate.ended()).toBe(true);
  });

  it('plays nothing and quiets nothing for a set without a mate’s sound', async () => {
    const { mate, falls } = mateSound({ has: () => false });
    mate.expect();
    mate.mated(1, Promise.resolve());
    await vi.advanceTimersByTimeAsync(1000);
    expect(falls).toEqual([]);
    expect(mate.ended()).toBe(false);
  });
});
