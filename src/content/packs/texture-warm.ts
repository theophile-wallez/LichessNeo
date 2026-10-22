import { extensionUrl, isConnected } from '#content/platform/runtime.ts';
import type { TextureId } from './textures.ts';

// Chrome asks for a texture's image when something first paints it, which is
// the board: on a page Lichess serves with one, that's the first paint, so the
// squares show their flat colors for a frame or two before the relief lands.
// Asking for the image as the board's pick is read, from document_start, starts
// the fetch before there is a board to paint. The image never goes in the page,
// so the request comes from the isolated world and Lichess's CSP, which allows
// no extension file, doesn't weigh on it.

const warmed = new Set<TextureId>();

/** Has the browser fetch and decode `texture`'s image, once per page. */
export function warmTexture(texture: TextureId | undefined): void {
  if (texture === undefined || warmed.has(texture) || !isConnected()) return;
  warmed.add(texture);
  new Image().src = extensionUrl(`img/boards/${texture}.webp`);
}
