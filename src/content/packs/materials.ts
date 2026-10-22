import type { FlatBoard } from './flat-boards.ts';
import { TEXTURES } from './textures.ts';

// The ready-made material boards, listed under one tile of the Board panel:
// each texture over the colors it was drawn in (tools/board-materials prints
// them), at full strength.

export const MATERIALS = 'materials';

const COLORS: Readonly<Record<(typeof TEXTURES)[number]['id'], readonly [string, string]>> = {
  'burl-gloss': ['#f1d6a9', '#6e3f2b'],
  burl: ['#d2a77a', '#623929'],
  vavona: ['#d3a87b', '#783c2c'],
  cocobolo: ['#d3a87b', '#883325'],
  amboyna: ['#d2a77a', '#a84e21'],
  olmo: ['#e5d7b4', '#8f421e'],
  padauk: ['#d2a77a', '#c52b09'],
  palisander: ['#d2a87b', '#462e25'],
  pomelle: ['#f2d2ae', '#b64417'],
  portoro: ['#eef1eb', '#3c382f'],
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
