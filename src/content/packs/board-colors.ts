import { createElement } from '#shared/dom.ts';
import type { Pack } from '#shared/packs/pack.ts';
import { squareColors } from '#shared/packs/square-colors.ts';

// Gives a board that names no colors those of its squares, read off the image.

const SIZE = 64;

/** The pack, its board with its squares' colors if it had none and they can be read. */
export async function withSquareColors(pack: Pack): Promise<Pack> {
  const { board } = pack;
  if (!board || board.light !== undefined) return pack;
  try {
    const image = new Image();
    image.src = board.image;
    await image.decode();
    const canvas = createElement('canvas', {
      attrs: { width: String(SIZE), height: String(SIZE) },
    });
    const context = canvas.getContext('2d');
    if (!context) return pack;
    context.drawImage(image, 0, 0, SIZE, SIZE);
    const colors = squareColors(context.getImageData(0, 0, SIZE, SIZE).data, SIZE);
    return { ...pack, board: { ...board, ...colors } };
  } catch {
    return pack;
  }
}
