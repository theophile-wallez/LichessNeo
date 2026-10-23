import type { FlatBoard } from './flat-boards.ts';
import { TEXTURES } from './textures.ts';

// The ready-made material boards, in three families (the woods, the marbles,
// the rest), each listed under one tile of the Board panel: each texture over
// the mean colors of the material it shows, which tools/board-materials
// prints, at full strength. The ten that reproduce a real board read theirs off
// its photographs (photo.py); the rest are the colors they were drawn in
// (generate.py).

// Their ids' prefix, kept in the boards the users picked.
export const MATERIALS = 'materials';

export const MATERIAL_FAMILIES = [
  { id: 'wood', name: 'Wood' },
  { id: 'marble', name: 'Marble' },
  { id: 'misc', name: 'Miscellaneous' },
] as const;

type MaterialFamily = (typeof MATERIAL_FAMILIES)[number]['id'];

const LOOKS: Readonly<
  Record<(typeof TEXTURES)[number]['id'], readonly [MaterialFamily, string, string]>
> = {
  'burl-gloss': ['wood', '#fbd19a', '#6d3b25'],
  burl: ['wood', '#d9aa77', '#603926'],
  vavona: ['wood', '#d9ad7d', '#803e28'],
  cocobolo: ['wood', '#f9c88f', '#680b02'],
  amboyna: ['wood', '#fcce95', '#b9440c'],
  olmo: ['wood', '#ecdab1', '#92401a'],
  padauk: ['wood', '#f7cc97', '#b81a03'],
  palisander: ['wood', '#f2be89', '#4a2b22'],
  pomelle: ['wood', '#fcdcac', '#c54810'],
  portoro: ['marble', '#eef1ea', '#37332b'],
  marble: ['marble', '#f7f5ef', '#636b77'],
  terrazzo: ['marble', '#efebe6', '#3f49a7'],
  slate: ['misc', '#d0ccc1', '#545f6c'],
  brushed: ['misc', '#d4d7dd', '#414b9f'],
  spun: ['misc', '#d9dadd', '#977f4f'],
  zellige: ['misc', '#e9e3d8', '#2d7981'],
  felt: ['misc', '#e6dfcf', '#275c4c'],
  leather: ['misc', '#ccb08c', '#734635'],
  blueprint: ['misc', '#5b94e2', '#1f468d'],
  halftone: ['misc', '#f3eee3', '#b6b8dc'],
  cork: ['misc', '#d0a573', '#60422d'],
};

export type MaterialBoard = FlatBoard & { readonly family: MaterialFamily };

export const MATERIAL_BOARDS: readonly MaterialBoard[] = TEXTURES.map(({ id, name }) => {
  const [family, light, dark] = LOOKS[id];
  return { id: `${MATERIALS}-${id}`, name, light, dark, texture: id, family };
});
