import { PIECE_NAMES, PiecesSchema, type Pack } from '#shared/packs/pack.ts';

// Test support: small packs, their images and sounds as valid data: URLs.

export const IMAGE = 'data:image/png;base64,iVBORw0KGgo=';
export const SOUND = 'data:audio/mpeg;base64,SUQz';

/** Twelve SVGs, each naming its pack and piece. */
const pieceImages = (tag: string): NonNullable<Pack['pieces']> =>
  PiecesSchema.parse(
    Object.fromEntries(
      PIECE_NAMES.map(name => [
        name,
        `data:image/svg+xml;base64,${btoa(`<svg id="${tag}-${name}"/>`)}`,
      ]),
    ),
  );

/** A pack with every part, or only those named. */
export function fakePack(
  id: string,
  parts: readonly ('board' | 'piece' | 'sound')[] = ['board', 'piece', 'sound'],
): Pack {
  return {
    id,
    name: `Pack ${id}`,
    link: `https://github.com/${id}`,
    ...(parts.includes('piece') && { pieces: pieceImages(id) }),
    ...(parts.includes('board') && { board: { image: IMAGE, light: '#eeeeee', dark: '#333333' } }),
    ...(parts.includes('sound') && { sounds: { capture: SOUND } }),
  };
}

/** One of the boards or piece sets a pack.json at `source` lists, under `packName`. */
export function listedPack(source: string, part: 'board' | 'piece', name: string): Pack {
  return { ...fakePack(`${source}#${part}:${name}`, [part]), name, packName: 'Set' };
}
