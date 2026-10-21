import { describe, expect, it } from 'vitest';
import { isHexColor } from './custom-board.ts';
import { MATERIAL_BOARDS } from './materials.ts';
import { TEXTURES } from './textures.ts';

describe('the material boards', () => {
  it('are each texture, in its order, over two colors of its own', () => {
    expect(MATERIAL_BOARDS.map(board => [board.id, board.name, board.texture])).toEqual(
      TEXTURES.map(({ id, name }) => [`materials-${id}`, name, id]),
    );
    for (const { light, dark, strength } of MATERIAL_BOARDS) {
      expect([isHexColor(light), isHexColor(dark)]).toEqual([true, true]);
      expect(strength).toBeUndefined();
    }
  });
});
