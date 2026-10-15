import { describe, expect, it } from 'vitest';
import { DEFAULT_KEY_SHAPE, keyBox } from '#shared/backlit.ts';
import { createSprites } from './sprites.ts';

const box = keyBox(DEFAULT_KEY_SHAPE);

describe('the lit keys’ sprites', () => {
  it('draws a key once per color, with room for its glow past the square', () => {
    const sprites = createSprites();
    const key = sprites.key('#fff', 100, box);
    expect([key.width, key.height]).toEqual([160, 160]);
    expect(sprites.key('#fff', 100, box)).toBe(key);
    expect(sprites.key('#f00', 100, box)).not.toBe(key);
  });

  it('draws them again when the board’s size or its keys’ shape changes', () => {
    const sprites = createSprites();
    const key = sprites.key('#fff', 100, box);
    const larger = sprites.key('#fff', 120, box);
    expect(larger).not.toBe(key);
    expect(larger.width).toBe(192);
    const wider = sprites.key('#fff', 120, keyBox({ ...DEFAULT_KEY_SHAPE, gap: 12 }));
    expect(wider).not.toBe(larger);
    const rounder = sprites.key('#fff', 120, keyBox({ gap: 12, radius: 40 }));
    expect(rounder).not.toBe(wider);
    expect(sprites.key('#fff', 120, keyBox({ gap: 12, radius: 40 }))).toBe(rounder);
  });
});
