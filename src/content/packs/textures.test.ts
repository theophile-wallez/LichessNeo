import { describe, expect, it } from 'vitest';
import { showTexture, StrengthSchema, TextureSchema } from './textures.ts';

const shown = (element: HTMLElement): string[] =>
  ['--ln-ext-thumb-texture', '--ln-ext-thumb-strength'].map(name =>
    element.style.getPropertyValue(name),
  );

describe('the board textures', () => {
  it('put a texture on an element by its variable, at its strength, and take it off', () => {
    const thumb = document.createElement('span');
    showTexture(thumb, 'thumb', { texture: 'marble', strength: 40 });
    expect(shown(thumb)).toEqual(['var(--ln-ext-texture-marble)', '40%']);
    showTexture(thumb, 'thumb', { texture: 'cork' });
    expect(shown(thumb)).toEqual(['var(--ln-ext-texture-cork)', '100%']);
    showTexture(thumb, 'thumb', { strength: 40 });
    expect(shown(thumb)).toEqual(['', '']);
  });

  it('keep only the textures there are, and strengths from 0 to 100', () => {
    expect(TextureSchema.safeParse('cocobolo').success).toBe(true);
    expect(TextureSchema.safeParse('velvet').success).toBe(false);
    expect([0, 55.5, 100].map(value => StrengthSchema.safeParse(value).success)).toEqual([
      true,
      true,
      true,
    ]);
    expect([-1, 101].map(value => StrengthSchema.safeParse(value).success)).toEqual([false, false]);
  });
});
