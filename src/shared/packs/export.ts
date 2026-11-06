import { PIECE_TOKEN } from './manifest.ts';
import { hasPart, PIECE_NAMES, type Pack, type PartKind } from './pack.ts';
import { dataUrlBytes } from './sniff.ts';
import type { ZipFile } from './zip.ts';

// The pack.json and files of a pack the user put together from the parts
// they have, as an author would write them: to share as a zip, or to put on
// GitHub as they are.

const EXTENSIONS: ReadonlyMap<string, string> = new Map([
  ['image/svg+xml', '.svg'],
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
  ['audio/mpeg', '.mp3'],
  ['audio/ogg', '.ogg'],
  ['audio/wav', '.wav'],
]);

const extensionOf = (url: string): string =>
  EXTENSIONS.get(url.slice('data:'.length, url.indexOf(';'))) ?? '';

/** A name as a file's: `Warm wood` is `warm-wood`. */
const fileSlug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z\d]+/g, '-')
    .replace(/^-|-$/g, '') || 'pack';

const fileOf = (path: string, url: string): ZipFile => ({
  path,
  data: new Uint8Array(dataUrlBytes(url)),
});

type Part<K extends 'board' | 'pieces' | 'sounds'> = NonNullable<Pack[K]>;
type BoardFields = Omit<Part<'board'>, 'image'> & { readonly image: string };

function boardFields(
  { image, light, dark }: Part<'board'>,
  path: string,
  files: ZipFile[],
): BoardFields {
  files.push(fileOf(path + extensionOf(image), image));
  return { image: path + extensionOf(image), ...(light && dark && { light, dark }) };
}

// pack.json names the pieces with one template: twelve of mixed types go without extensions.
function pieces(set: Part<'pieces'>, folder: string, files: ZipFile[]): string {
  const extensions = new Set(PIECE_NAMES.map(name => extensionOf(set[name])));
  const [extension = ''] = extensions.size === 1 ? extensions : [];
  for (const name of PIECE_NAMES) files.push(fileOf(`${folder}${name}${extension}`, set[name]));
  return `${folder}${PIECE_TOKEN}${extension}`;
}

function sounds(set: Part<'sounds'>, folder: string, files: ZipFile[]): Record<string, string> {
  return Object.fromEntries(
    Object.entries(set).map(([name, url]) => {
      const path = `${folder}${name}${extensionOf(url)}`;
      files.push(fileOf(path, url));
      return [name, path];
    }),
  );
}

/** The names in a form, the second of one form numbered: a list's names must differ. */
function numbered(
  names: readonly string[],
  form: (name: string) => string,
  glue: string,
): string[] {
  const seen = new Set<string>();
  return names.map(name => {
    let unique = form(name);
    // Cut first: pack.json's names are 40 characters at most.
    for (let i = 2; seen.has(unique); i++) unique = `${form(name).slice(0, 36)}${glue}${i}`;
    seen.add(unique);
    return unique;
  });
}

/** A pack to export: its name, and the boards, piece sets and sound sets it holds. */
export interface PackToExport {
  readonly name: string;
  /** Each with the parts it gives the pack: one of a kind is the pack's own, several a list. */
  readonly parts: readonly Pack[];
}

// Writes an item's part: as the pack's own with no slug, else as a listed one.
type Writer = (item: Pack, slug: string | null, files: ZipFile[]) => unknown;

const writeBoard: Writer = ({ name, board }, slug, files) => {
  if (!board) return undefined;
  if (slug === null) return boardFields(board, 'board', files);
  return { name, ...boardFields(board, `boards/${slug}`, files) };
};

const writePieces: Writer = ({ name, pieces: set }, slug, files) => {
  if (!set) return undefined;
  if (slug === null) return pieces(set, 'pieces/', files);
  return { name, path: pieces(set, `pieces/${slug}/`, files) };
};

const writeSounds: Writer = ({ name, sounds: set }, slug, files) => {
  if (!set) return undefined;
  if (slug === null) return sounds(set, 'sounds/', files);
  return { name, files: sounds(set, `sounds/${slug}/`, files) };
};

/** A field of pack.json: the one item's part, the list of several, or none. */
function field(items: readonly Pack[], write: Writer, files: ZipFile[]): unknown {
  const [lone] = items;
  if (lone === undefined) return undefined;
  if (items.length === 1) return write(lone, null, files);
  const names = items.map(item => item.name);
  const slugs = numbered(names, fileSlug, '-');
  const labels = numbered(names, name => name, ' ');
  return items.map((item, i) =>
    write({ ...item, name: labels[i] ?? item.name }, slugs[i] ?? '', files),
  );
}

/** The pack.json and the files of the pack, ready to zip. */
export function exportFiles({ name, parts }: PackToExport): ZipFile[] {
  const files: ZipFile[] = [];
  const of = (kind: PartKind): Pack[] => parts.filter(part => hasPart(part, kind));
  // JSON leaves out a field that's undefined.
  const manifest = {
    name,
    board: field(of('board'), writeBoard, files),
    pieces: field(of('piece'), writePieces, files),
    sounds: field(of('sound'), writeSounds, files),
  };
  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  return [{ path: 'pack.json', data: new TextEncoder().encode(json) }, ...files];
}
