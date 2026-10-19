import { expect, it } from 'vitest';
import { sha256Hex } from '#shared/testing/digest.ts';
import { STRAND_TEXELS, strandData } from './strands.ts';

// The same numbers on every run (mulberry32), so the texture is too.
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
  };
}

const digest = (data: Uint8Array): Promise<string> => sha256Hex(data.join(','));

it('draws the texture it always has from the same numbers', async () => {
  expect(strandData(seeded(1))).toHaveLength(STRAND_TEXELS ** 3 * 2);
  expect(await digest(strandData(seeded(1)))).toBe(
    '61ea2e1a406ed7ee93de01166bfebb5eb0ac287e6c3fe6a7429b1fa7d2a24890',
  );
  expect(await digest(strandData(seeded(42)))).toBe(
    '897ee63273c754767f46d8e52c65f856dcb1f6a5cfa632ecf3f1189ff4def139',
  );
});
