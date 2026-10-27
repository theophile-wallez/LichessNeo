import type { FileDownload, FileKind, ManifestDownload } from './download.ts';
import { PackError, tooBig } from './github.ts';
import { PIECE_TOKEN, type Manifest } from './manifest.ts';
import { PackSchema, PIECE_NAMES, PiecesSchema, SoundsSchema, type Pack } from './pack.ts';
import { itemId } from './source.ts';

// Puts a pack.json's packs together from its files, read one by one, a few
// at a time: a stored pack for its lone board, pieces and sounds, under its
// name, and one for each board, piece set or sound set it lists, under that
// one's name.

const MAX_ITEM_BYTES = 16 * 1024 * 1024;
// Enough to keep GitHub busy, few enough for it not to turn requests down.
const FILES_AT_ONCE = 6;

/** Reads one of the pack's files, as a data: URL. */
export type ReadFile = (path: string, kind: FileKind) => Promise<string>;

type Boards = NonNullable<Manifest['board']>;
type BoardPaths = Omit<Extract<Boards, readonly unknown[]>[number], 'name'>;
type SoundPaths = Exclude<NonNullable<Manifest['sounds']>, readonly unknown[]>;

/** What one stored pack is read from. */
interface Plan {
  readonly id: string;
  readonly name: string;
  readonly packName?: string;
  readonly pieces?: string;
  readonly board?: BoardPaths;
  readonly sounds?: SoundPaths;
}

function lonePlan({ name, board, pieces, sounds }: Manifest, sourceId: string): Plan[] {
  const plan: Plan = {
    id: sourceId,
    name,
    ...(board !== undefined && !Array.isArray(board) && { board }),
    ...(typeof pieces === 'string' && { pieces }),
    ...(sounds !== undefined && !Array.isArray(sounds) && { sounds }),
  };
  return plan.board || plan.pieces || plan.sounds ? [plan] : [];
}

function listedPlans(manifest: Manifest, sourceId: string): Plan[] {
  const { board, pieces, sounds } = manifest;
  type Part = Pick<Plan, 'board' | 'pieces' | 'sounds'>;
  const item = (kind: string, name: string, part: Part): Plan => ({
    id: itemId(sourceId, kind, name),
    name,
    packName: manifest.name,
    ...part,
  });
  return [
    ...(Array.isArray(board)
      ? board.map(({ name, ...paths }) => item('board', name, { board: paths }))
      : []),
    ...(Array.isArray(pieces)
      ? pieces.map(({ name, path }) => item('piece', name, { pieces: path }))
      : []),
    ...(Array.isArray(sounds)
      ? sounds.map(({ name, files }) => item('sound', name, { sounds: files }))
      : []),
  ];
}

// A data: URL's base64 holds 3 bytes in every 4 characters.
const byteSize = (url: string): number => ((url.length - url.indexOf(',') - 1) * 3) / 4;

/** Reads a plan's files, counting them against its size. */
function planReader(plan: Plan, readFile: ReadFile): ReadFile {
  let used = 0;
  return async (path, kind) => {
    const url = await readFile(path, kind);
    used += byteSize(url);
    const what = plan.packName === undefined ? 'The pack' : `“${plan.name}”`;
    if (used > MAX_ITEM_BYTES) throw tooBig(what, MAX_ITEM_BYTES);
    return url;
  };
}

async function readPieces(read: ReadFile, template: string): Promise<Pack['pieces']> {
  const entries = await Promise.all(
    PIECE_NAMES.map(async name => [
      name,
      await read(template.replaceAll(PIECE_TOKEN, name), 'image'),
    ]),
  );
  return PiecesSchema.parse(Object.fromEntries(entries));
}

async function readSounds(read: ReadFile, paths: SoundPaths): Promise<Pack['sounds']> {
  const entries = await Promise.all(
    Object.entries(paths).map(async ([name, path]) => [name, await read(path, 'sound')]),
  );
  return SoundsSchema.parse(Object.fromEntries(entries));
}

async function readPlan(plan: Plan, link: string, readFile: ReadFile): Promise<Pack> {
  const read = planReader(plan, readFile);
  const { id, name, packName, board } = plan;
  const [pieces, image, sounds] = await Promise.all([
    plan.pieces === undefined ? undefined : readPieces(read, plan.pieces),
    board === undefined ? undefined : read(board.image, 'image'),
    plan.sounds === undefined ? undefined : readSounds(read, plan.sounds),
  ]);
  const pack = PackSchema.safeParse({
    id,
    name,
    link,
    ...(packName !== undefined && { packName }),
    ...(pieces && { pieces }),
    ...(board && image !== undefined && { board: { ...board, image } }),
    ...(sounds && { sounds }),
  });
  if (!pack.success) throw new PackError('The pack could not be read.');
  return pack.data;
}

interface Assembly {
  readonly manifest: Manifest;
  /** The id of the pack.json's folder. */
  readonly source: string;
  readonly link: string;
  readonly readFile: ReadFile;
}

/** Every pack the pack.json gives, its lone parts' first. */
function assemblePacks({ manifest, source, link, readFile }: Assembly): Promise<Pack[]> {
  const plans = [...lonePlan(manifest, source), ...listedPlans(manifest, source)];
  return Promise.all(plans.map(plan => readPlan(plan, link, readFile)));
}

/** Lets `limit` reads run at once, the others in turn; once one fails, none starts. */
function inTurns(readFile: ReadFile, limit: number): ReadFile {
  let running = 0;
  let failed = false;
  const waiting: (() => void)[] = [];
  const start = (): Promise<void> => {
    if (running >= limit) return new Promise(resolve => waiting.push(resolve));
    running += 1;
    return Promise.resolve();
  };
  // A read that ends hands its turn straight to the next, which no new read can take first.
  const end = (): void => {
    const next = waiting.shift();
    if (next) next();
    else running -= 1;
  };
  return async (path, kind) => {
    await start();
    try {
      if (failed) throw new PackError('Stopped.');
      return await readFile(path, kind);
    } catch (error) {
      failed = true;
      throw error;
    } finally {
      end();
    }
  };
}

/** Where a pack.json and its files are read: the worker's answers (shared/packs/download.ts). */
export interface PackFolder {
  readonly manifest: () => Promise<ManifestDownload>;
  readonly file: (path: string, kind: FileKind) => Promise<FileDownload>;
}

/** The packs, and the id of the pack.json they came from: its earlier ones are replaced. */
export type Import =
  | { readonly source: string; readonly packs: readonly Pack[] }
  | { readonly error: string };

/** Reads every pack of the pack.json a link points at, or why it can't be. */
export async function importPacks(folder: PackFolder, link: string): Promise<Import> {
  const readFile = inTurns(async (path, kind) => {
    const file = await folder.file(path, kind);
    if ('error' in file) throw new PackError(file.error);
    return file.url;
  }, FILES_AT_ONCE);
  try {
    const answer = await folder.manifest();
    if ('error' in answer) return answer;
    const { manifest, source } = answer;
    return {
      source,
      packs: await assemblePacks({ manifest, source, link: link.trim(), readFile }),
    };
  } catch (error) {
    if (error instanceof PackError) return { error: error.message };
    throw error;
  }
}
