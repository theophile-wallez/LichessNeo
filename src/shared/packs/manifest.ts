import { z } from 'zod/mini';
import { SoundNameSchema } from '#shared/sounds.ts';
import { HexColorSchema } from './pack.ts';

// A pack's pack.json, as its author writes it (docs/packs.md). Its board,
// pieces and sounds are each one, or a list of named ones. Every path is
// relative to the folder of pack.json, and may not leave it.

/** Stands for each piece's name (wK, wQ … bP) in the pieces' path. */
export const PIECE_TOKEN = '{piece}';

const isInFolder = (path: string): boolean =>
  !path.startsWith('/') &&
  path
    .split('/')
    .every(part => part !== '' && part !== '.' && part !== '..' && !/[\\?#]/.test(part));

const PathSchema = z.string().check(z.maxLength(200), z.refine(isInFolder));
const NameSchema = z.string().check(z.minLength(1), z.maxLength(40));

const BOARD = {
  image: PathSchema,
  light: z.optional(HexColorSchema),
  dark: z.optional(HexColorSchema),
};
// The coordinates take both colors, or keep Lichess's.
const bothColors = z.refine<{
  readonly light?: string | undefined;
  readonly dark?: string | undefined;
}>(board => (board.light === undefined) === (board.dark === undefined));
const PiecesPathSchema = PathSchema.check(z.refine(path => path.includes(PIECE_TOKEN)));
// Imported, a set of no sound would show in no list, and couldn't be removed.
const SoundPathsSchema = z
  .partialRecord(SoundNameSchema, PathSchema)
  .check(z.refine(sounds => Object.keys(sounds).length > 0));

// An item's id is made of its name: two of one name would be one item.
const uniqueNames = z.refine<readonly { readonly name: string }[]>(
  items => new Set(items.map(item => item.name)).size === items.length,
);

const BoardsSchema = z.union([
  z.object(BOARD).check(bothColors),
  z
    .array(z.object({ name: NameSchema, ...BOARD }).check(bothColors))
    .check(z.minLength(1), uniqueNames),
]);
const PieceSetsSchema = z.union([
  PiecesPathSchema,
  z
    .array(z.object({ name: NameSchema, path: PiecesPathSchema }))
    .check(z.minLength(1), uniqueNames),
]);
const SoundSetsSchema = z.union([
  SoundPathsSchema,
  z
    .array(z.object({ name: NameSchema, files: SoundPathsSchema }))
    .check(z.minLength(1), uniqueNames),
]);

export const ManifestSchema = z
  .object({
    name: NameSchema,
    pieces: z.optional(PieceSetsSchema),
    board: z.optional(BoardsSchema),
    sounds: z.optional(SoundSetsSchema),
  })
  .check(
    z.refine(
      manifest =>
        manifest.pieces !== undefined ||
        manifest.board !== undefined ||
        manifest.sounds !== undefined,
    ),
  );

export type Manifest = z.infer<typeof ManifestSchema>;

type Issue = z.core.$ZodIssue;

// A field is one or a list: of a union's branches, the one of the value's
// type says what's wrong, the other only that it's not of its type.
const ofOtherType = (issues: readonly Issue[]): boolean =>
  issues.every(issue => issue.code === 'invalid_type' && issue.path.length === 0);

function issuePath(issue: Issue): PropertyKey[] {
  if (issue.code !== 'invalid_union') return issue.path;
  const inner = issue.errors.find(issues => !ofOtherType(issues))?.[0];
  return inner ? [...issue.path, ...issuePath(inner)] : issue.path;
}

/** Where the first problem is, for the user: `pieces`, `board.1.image`… or '' for the whole file. */
export function firstIssuePath(manifest: unknown): string | null {
  const result = ManifestSchema.safeParse(manifest);
  if (result.success) return null;
  const [issue] = result.error.issues;
  return issue ? issuePath(issue).map(String).join('.') : '';
}
