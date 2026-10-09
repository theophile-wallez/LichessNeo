// The original drew pieces as bundled images (`<img … src="…/img/pieces/neo/wp.webp">`);
// we draw them from the board's set (#shared/piece-glyph.ts). Maps a recording
// of the original to that, so the recording stays the reference.

const NEO_IMAGE = /<img [^>]*?src="[^"]*\/img\/pieces\/neo\/(\w\w)\.webp"[^>]*>/g;

export function withPieceGlyphs(markup: string): string;
export function withPieceGlyphs(markup: string | null): string | null;
export function withPieceGlyphs(markup: string | null): string | null {
  return markup?.replace(NEO_IMAGE, '<i class="lr-ext-pc lr-ext-pc-$1"></i>') ?? null;
}
