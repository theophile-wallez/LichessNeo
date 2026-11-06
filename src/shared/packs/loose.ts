import type { SoundName } from '#shared/sounds.ts';
import { PackError } from './github.ts';
import { ManifestSchema, PIECE_TOKEN, type Manifest } from './manifest.ts';
import { PIECE_NAMES, type PartKind, type PieceName } from './pack.ts';
import { fileType, folderOf, pieceOfFile, soundOfFile } from './loose-names.ts';

// The pack.json of files dropped with none, on the zone of their kind: a
// piece set for each folder of the twelve pieces, a board for each image, a
// sound set for each folder of sounds, each a named item of a list. Each file gets a path of its own, in a folder that exists
// only here, so a set of mixed types still fits the pieces' one template.

export interface LooseFolder {
  readonly manifest: Manifest;
  /** Each file's path in the pack.json, to its own. */
  readonly files: ReadonlyMap<string, string>;
}

const MAX_NAME = 40;

interface Found {
  readonly pieces: Map<string, Map<PieceName, string>>;
  readonly sounds: Map<string, Map<SoundName, string>>;
  readonly boards: string[];
}

function addTo<K>(groups: Map<string, Map<K, string>>, key: K, path: string): void {
  const folder = folderOf(path);
  const group = groups.get(folder) ?? new Map<K, string>();
  const taken = group.get(key);
  if (taken !== undefined) throw new PackError(`${taken} and ${path} are both ${String(key)}.`);
  groups.set(folder, group.set(key, path));
}

// A file of another kind than the zone's is a mistake, but one that's
// neither an image nor a sound (a readme in the folder) is left out.
function misplaced(path: string, kind: PartKind): string | null {
  const type = fileType(path);
  if (type === 'other') return null;
  if (kind === 'sound')
    return type === 'sound' ? null : `${path} is not a sound: drop it on the pieces or the board.`;
  if (type === 'sound') return `${path} is a sound: drop it on the sounds.`;
  if (kind === 'piece' && pieceOfFile(path) === null)
    return `${path}: name each piece by its color and role, as wK, bQ or bP.`;
  return null;
}

function find(paths: readonly string[], kind: PartKind): Found {
  const found: Found = { pieces: new Map(), sounds: new Map(), boards: [] };
  for (const path of paths) {
    const mistake = misplaced(path, kind);
    if (mistake !== null) throw new PackError(mistake);
    const type = fileType(path);
    const piece = kind === 'piece' && type === 'image' ? pieceOfFile(path) : null;
    const sound = type === 'sound' ? soundOfFile(path) : null;
    if (piece !== null) addTo(found.pieces, piece, path);
    else if (type === 'image') found.boards.push(path);
    else if (sound !== null) addTo(found.sounds, sound, path);
    else if (type === 'sound')
      throw new PackError(`${path}: name a sound after what it plays, as move-self or capture.`);
  }
  return found;
}

const trimmed = (name: string): string => name.trim().slice(0, MAX_NAME);

// A list's names must differ: the second "Dark" is "Dark 2".
function uniqueNames(names: readonly string[]): string[] {
  const seen = new Set<string>();
  return names.map(name => {
    let unique = trimmed(name);
    for (let i = 2; seen.has(unique); i++) unique = `${trimmed(name).slice(0, MAX_NAME - 3)} ${i}`;
    seen.add(unique);
    return unique;
  });
}

const folderName = (folder: string, fallback: string): string =>
  folder.split('/').at(-2) ?? fallback;

interface Parts {
  readonly files: Map<string, string>;
  readonly name: string;
}

function pieceSets(found: Found, { files, name }: Parts): Pick<Manifest, 'pieces'> {
  const sets = [...found.pieces];
  if (sets.length === 0) return {};
  const names = uniqueNames(sets.map(([folder]) => folderName(folder, name)));
  return {
    pieces: sets.map(([folder, pieces], i) => {
      const missing = PIECE_NAMES.filter(piece => !pieces.has(piece));
      if (missing.length > 0)
        throw new PackError(`${folder || 'The pieces'} lack ${missing.join(', ')}.`);
      for (const [piece, path] of pieces) files.set(`pieces/${i}/${piece}`, path);
      return { name: names[i] ?? name, path: `pieces/${i}/${PIECE_TOKEN}` };
    }),
  };
}

function boards(found: Found, { files, name }: Parts): Pick<Manifest, 'board'> {
  if (found.boards.length === 0) return {};
  const names = uniqueNames(found.boards.map(() => name));
  return {
    board: found.boards.map((path, i) => {
      files.set(`boards/${i}`, path);
      return { name: names[i] ?? '', image: `boards/${i}` };
    }),
  };
}

function soundSets(found: Found, { files, name }: Parts): Pick<Manifest, 'sounds'> {
  if (found.sounds.size === 0) return {};
  const names = uniqueNames([...found.sounds.keys()].map(folder => folderName(folder, name)));
  return {
    sounds: [...found.sounds.values()].map((sounds, i) => ({
      name: names[i] ?? name,
      files: Object.fromEntries(
        [...sounds].map(([sound, path]) => {
          files.set(`sounds/${i}/${sound}`, path);
          return [sound, `sounds/${i}/${sound}`];
        }),
      ),
    })),
  };
}

/** The zone the files were dropped on, and the name of those not in a folder. */
export interface LooseDrop {
  readonly kind: PartKind;
  readonly name: string;
}

const NOTHING: Readonly<Record<PartKind, string>> = {
  piece: 'There are no pieces there.',
  board: 'There is no image there.',
  sound: 'There are no sounds there.',
};

/** The pack.json of the files dropped on the zone of one kind. */
export function looseFolder(paths: readonly string[], { name, kind }: LooseDrop): LooseFolder {
  const found = find(paths, kind);
  const parts: Parts = { files: new Map(), name: trimmed(name) };
  const manifest = ManifestSchema.safeParse({
    name: parts.name,
    ...pieceSets(found, parts),
    ...boards(found, parts),
    ...soundSets(found, parts),
  });
  if (!manifest.success) throw new PackError(NOTHING[kind]);
  return { manifest: manifest.data, files: parts.files };
}
