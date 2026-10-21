import type { FlatBoard } from './flat-boards.ts';
import { TEXTURES } from './textures.ts';

// The ready-made material boards, listed under one tile of the Board panel:
// each texture over the colors it was drawn in (tools/board-materials prints
// them), at full strength.

export const MATERIALS = 'materials';

const COLORS: Readonly<Record<(typeof TEXTURES)[number]['id'], readonly [string, string]>> = {
  ash: ['#e5dcca', '#3b4493'],
  parquet: ['#e4cba1', '#6b4e39'],
  'end-grain': ['#d6b485', '#6d472c'],
  marble: ['#f7f5ef', '#636b77'],
  terrazzo: ['#efebe6', '#3f49a7'],
  slate: ['#d0cbc0', '#545f6b'],
  brushed: ['#d4d6dc', '#414a9f'],
  spun: ['#d9d9dc', '#977f4f'],
  zellige: ['#e9e3d8', '#2f7a82'],
  felt: ['#e6dfcf', '#275c4c'],
  leather: ['#ccb08b', '#734635'],
  blueprint: ['#5b94e2', '#20478e'],
  halftone: ['#f3eee3', '#b6b7dc'],
  cork: ['#d0a574', '#60422d'],
};

export const MATERIAL_BOARDS: readonly FlatBoard[] = TEXTURES.map(({ id, name }) => {
  const [light, dark] = COLORS[id];
  return { id: `${MATERIALS}-${id}`, name, light, dark, texture: id };
});
