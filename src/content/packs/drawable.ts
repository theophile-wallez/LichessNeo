import type { Import } from '#shared/packs/assemble.ts';
import { PIECE_NAMES, type Pack } from '#shared/packs/pack.ts';

// Each image of an import is drawn once before it's kept, as that needs a
// DOM: Lichess decodes every piece before it draws the board, and draws none
// if one fails.

async function decodes(url: string): Promise<boolean> {
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    return true;
  } catch {
    return false;
  }
}

/** What of the pack the browser can't draw, or null. */
async function undrawable({ pieces, board }: Pack): Promise<string | null> {
  const images = [
    ...(pieces ? PIECE_NAMES.map(name => ({ what: `The piece ${name}`, url: pieces[name] })) : []),
    ...(board ? [{ what: 'The board', url: board.image }] : []),
  ];
  const drawn = await Promise.all(images.map(image => decodes(image.url)));
  return images.find((_, i) => drawn[i] !== true)?.what ?? null;
}

/** What of the packs the browser can't draw, naming its pack when there are several, or null. */
async function firstUndrawable(packs: readonly Pack[]): Promise<string | null> {
  const broken = await Promise.all(
    packs.map(async pack => {
      const what = await undrawable(pack);
      return what !== null && packs.length > 1 ? `${what} of “${pack.name}”` : what;
    }),
  );
  return broken.find(what => what !== null) ?? null;
}

/** The import, or why one of its images can't be drawn. */
export async function drawable(imported: Import): Promise<Import> {
  if ('error' in imported) return imported;
  const broken = await firstUndrawable(imported.packs);
  return broken === null ? imported : { error: `${broken} can't be drawn.` };
}
