import { createElement } from '#shared/dom.ts';
import { isPicture, PICTURE_SIZE } from '#shared/own-avatar.ts';

// A picture the user picks for their avatar, cut to a square at its center and
// shrunk, so it's kept in the page's storage in a few kilobytes.

// Past this, the file is surely not a photo meant for an avatar.
const MAX_FILE_BYTES = 20_000_000;
const QUALITY = 0.86;

/** The picture in `file` as a WebP data: URL (PNG where the browser can't write WebP); null if it isn't one. */
export async function pictureFrom(file: Blob): Promise<string | null> {
  if (file.size > MAX_FILE_BYTES) return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = createElement('canvas');
  canvas.width = PICTURE_SIZE;
  canvas.height = PICTURE_SIZE;
  const context = canvas.getContext('2d');
  if (!context || side === 0) return null;
  context.imageSmoothingQuality = 'high';
  const x = (bitmap.width - side) / 2;
  const y = (bitmap.height - side) / 2;
  context.drawImage(bitmap, x, y, side, side, 0, 0, PICTURE_SIZE, PICTURE_SIZE);
  bitmap.close();
  const url = canvas.toDataURL('image/webp', QUALITY);
  return isPicture(url) ? url : null;
}
