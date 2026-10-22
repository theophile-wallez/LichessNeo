import type { FlatBoard } from './flat-boards.ts';
import { TEXTURES } from './textures.ts';

// The ready-made material boards, listed under one tile of the Board panel:
// each texture over the mean colors of the material it shows, which
// tools/board-materials prints, at full strength. The ten that reproduce a real
// board read theirs off its photographs (photo.py); the rest are the colors
// they were drawn in (generate.py).

export const MATERIALS = 'materials';

const COLORS: Readonly<Record<(typeof TEXTURES)[number]['id'], readonly [string, string]>> = {
  'burl-gloss': ['#f9d09b', '#6c3c27'],
  burl: ['#d5a877', '#5f3726'],
  vavona: ['#d6ab7d', '#803f2b'],
  cocobolo: ['#f6c68f', '#6e0c05'],
  amboyna: ['#f9c890', '#b6430e'],
  olmo: ['#ebd9b2', '#903f1c'],
  padauk: ['#f6cc98', '#b91905'],
  palisander: ['#efbb88', '#482c22'],
  pomelle: ['#fad9ab', '#bf4411'],
  portoro: ['#eef1eb', '#39362e'],
  marble: ['#f7f5ef', '#636b77'],
  terrazzo: ['#efebe6', '#3f49a7'],
  slate: ['#d0ccc1', '#545f6c'],
  brushed: ['#d4d7dd', '#414b9f'],
  spun: ['#d9dadd', '#977f4f'],
  zellige: ['#e9e3d8', '#2d7981'],
  felt: ['#e6dfcf', '#275c4c'],
  leather: ['#ccb08c', '#734635'],
  blueprint: ['#5b94e2', '#1f468d'],
  halftone: ['#f3eee3', '#b6b8dc'],
  cork: ['#d0a573', '#60422d'],
};

export const MATERIAL_BOARDS: readonly FlatBoard[] = TEXTURES.map(({ id, name }) => {
  const [light, dark] = COLORS[id];
  return { id: `${MATERIALS}-${id}`, name, light, dark, texture: id };
});
