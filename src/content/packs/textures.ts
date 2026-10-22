import { z } from 'zod/mini';
import { setStyleProperty } from '#shared/dom.ts';

// The board textures: a relief per material (tools/board-materials), laid over
// a two-tone board's colors in `hard-light`, so any colors take it
// (styles/board/textures.css). The relief holds a gap per channel, which is how
// a wood's squares each come in their own color. The custom board picks a
// texture and how strongly it shows; a ready-made material board comes with its
// own (materials.ts). The woods and the marbles come first: each is a pair of
// species or stones drawn to numbers measured on photographs of one real board,
// and named as it names them.

export const TEXTURES = [
  { id: 'burl-gloss', name: 'Maple & burl' },
  { id: 'burl', name: 'Bird’s eye & burl' },
  { id: 'vavona', name: 'Bird’s eye & vavona' },
  { id: 'cocobolo', name: 'Bird’s eye & cocobolo' },
  { id: 'amboyna', name: 'Bird’s eye & amboyna' },
  { id: 'olmo', name: 'Maple & olmo' },
  { id: 'padauk', name: 'Bird’s eye & padauk' },
  { id: 'palisander', name: 'Bird’s eye & palisander' },
  { id: 'pomelle', name: 'Curly maple & pomelle' },
  { id: 'portoro', name: 'White & Portoro' },
  { id: 'marble', name: 'Marble' },
  { id: 'terrazzo', name: 'Terrazzo' },
  { id: 'slate', name: 'Slate' },
  { id: 'brushed', name: 'Brushed metal' },
  { id: 'spun', name: 'Spun metal' },
  { id: 'zellige', name: 'Zellige' },
  { id: 'felt', name: 'Felt' },
  { id: 'leather', name: 'Leather' },
  { id: 'blueprint', name: 'Blueprint' },
  { id: 'halftone', name: 'Halftone' },
  { id: 'cork', name: 'Cork' },
] as const;

export type TextureId = (typeof TEXTURES)[number]['id'];

const TEXTURE_IDS = TEXTURES.map(texture => texture.id);

export const TextureSchema = z.enum(TEXTURE_IDS);

/** How much of the texture shows, in percent: none of it at 0, all at 100. */
export const StrengthSchema = z.number().check(z.gte(0), z.lte(100));

export const FULL_STRENGTH = 100;

// A board the user saved or coloured names its texture, and a texture can leave the
// list: such a board keeps its colors and loses its texture, rather than failing to
// read and taking the whole saved list with it (saved-boards.ts).
export const TexturingSchema = z.object({
  texture: z.catch(z.optional(TextureSchema), undefined),
  strength: z.optional(StrengthSchema),
});

export type Texturing = z.infer<typeof TexturingSchema>;

/**
 * Gives `element` the texture under `name`'s variables: its image, by the
 * variable the stylesheet names it in (an extension URL can only be written
 * there), and its strength.
 */
export function showTexture(element: HTMLElement, name: string, texturing: Texturing): void {
  const { texture, strength = FULL_STRENGTH } = texturing;
  setStyleProperty(
    element,
    `--ln-ext-${name}-texture`,
    texture === undefined ? null : `var(--ln-ext-texture-${texture})`,
  );
  setStyleProperty(
    element,
    `--ln-ext-${name}-strength`,
    texture === undefined ? null : `${strength}%`,
  );
}
