import { z } from 'zod/mini';
import { roleOfLetter } from '#shared/chess/pieces.ts';
import type { Color, Role } from '#shared/chess/types.ts';
import { SoundNameSchema } from '#shared/sounds.ts';

// A pack as the extension keeps it once imported: its pieces, board and
// sounds as data: URLs, so it needs nothing from GitHub again.

/** Each piece as Lichess names its images (public/piece/<set>/wK.svg). */
const PieceNameSchema = z.enum([
  'wK',
  'wQ',
  'wR',
  'wB',
  'wN',
  'wP',
  'bK',
  'bQ',
  'bR',
  'bB',
  'bN',
  'bP',
]);

export type PieceName = z.infer<typeof PieceNameSchema>;
export const PIECE_NAMES: readonly PieceName[] = PieceNameSchema.options;

export interface PieceOf {
  readonly color: Color;
  readonly role: Role;
}

export function pieceOf(name: PieceName): PieceOf {
  return {
    color: name.startsWith('w') ? 'white' : 'black',
    role: roleOfLetter(name[1] ?? '') ?? 'pawn',
  };
}

/** The variable Lichess draws a piece from (`.is2d .pawn.white { background-image: var(---white-pawn) }`). */
export const pieceVariable = (name: PieceName): string => {
  const { color, role } = pieceOf(name);
  return `---${color}-${role}`;
};

// Checked again when read back: these strings end up in a stylesheet, and
// sounds go through atob, which throws on anything but whole base64. One
// pass of a character class: a repeated group overflows the regex engine's
// stack on a few megabytes.
const isWholeBase64 = (url: string): boolean => (url.length - url.indexOf(',') - 1) % 4 === 0;
const ImageSchema = z
  .string()
  .check(z.regex(/^data:image\/[\w.+-]+;base64,[A-Za-z0-9+/]*={0,2}$/), z.refine(isWholeBase64));
const AudioSchema = z
  .string()
  .check(z.regex(/^data:audio\/[\w.+-]+;base64,[A-Za-z0-9+/]*={0,2}$/), z.refine(isWholeBase64));
export const HexColorSchema = z.string().check(z.regex(/^#[\da-f]{6}$/i));

export const PiecesSchema = z.record(PieceNameSchema, ImageSchema);
export const SoundsSchema = z.partialRecord(SoundNameSchema, AudioSchema);

export const PackSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** The link it was imported from. */
  link: z.string(),
  pieces: z.optional(PiecesSchema),
  board: z.optional(
    z.object({
      image: ImageSchema,
      // The squares' colors, for the coordinates drawn on them.
      light: z.optional(HexColorSchema),
      dark: z.optional(HexColorSchema),
    }),
  ),
  sounds: z.optional(SoundsSchema),
});

export type Pack = z.infer<typeof PackSchema>;

/** What a pack can change, each picked on its own. */
export type PartKind = 'board' | 'piece' | 'sound';

export const PART_KINDS: readonly PartKind[] = ['board', 'piece', 'sound'];

export function hasPart(pack: Pack, kind: PartKind): boolean {
  if (kind === 'board') return pack.board !== undefined;
  if (kind === 'piece') return pack.pieces !== undefined;
  return pack.sounds !== undefined && Object.keys(pack.sounds).length > 0;
}
