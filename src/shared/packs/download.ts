import { firstIssuePath, ManifestSchema, type Manifest } from './manifest.ts';
import { audioType, dataUrl, imageType } from './sniff.ts';
import { createReader, PackError, type Read } from './github.ts';
import { MANIFEST_FILE, packId, parsePackLink, type PackSource } from './source.ts';

// Reads a pack's pack.json and files from GitHub, one request each, for the
// content script that puts the pack together (content/packs/import.ts): a
// file at a time, a pack crosses no message of more than one file's size.
// Any failure comes back as a sentence for the user. A private repository's
// token is used for this import only. Run by the background worker: Firefox
// lets a content script fetch nothing the page's CSP doesn't, and Lichess's
// names no GitHub.

const KB = 1024;
const MAX_MANIFEST_BYTES = 64 * KB;
export const MAX_FILE_BYTES = 2 * KB * KB;

/** The pack.json, and the id of the folder it's in. */
export type ManifestDownload =
  | { readonly source: string; readonly manifest: Manifest }
  | { readonly error: string };

/** A file, as a data: URL. */
export type FileDownload = { readonly url: string } | { readonly error: string };

export type FileKind = 'image' | 'sound';

async function readManifest(read: Read): Promise<Manifest> {
  const bytes = await read(MANIFEST_FILE, MAX_MANIFEST_BYTES);
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new PackError(`${MANIFEST_FILE} is not valid JSON.`);
  }
  const result = ManifestSchema.safeParse(json);
  if (result.success) return result.data;
  const where = firstIssuePath(json);
  throw new PackError(
    where
      ? `${MANIFEST_FILE}: "${where}" is not right.`
      : `${MANIFEST_FILE} has no pieces, board or sounds.`,
  );
}

async function readFile(read: Read, path: string, kind: FileKind): Promise<string> {
  const bytes = await read(path, MAX_FILE_BYTES);
  const type = kind === 'image' ? imageType(bytes) : audioType(bytes);
  if (type === null)
    throw new PackError(`${path} is not ${kind === 'image' ? 'an image' : 'a sound'}.`);
  return dataUrl(type, bytes);
}

const NOT_A_LINK = { error: 'That is not a link to a folder on GitHub.' };

/** Runs `run` on the folder a link points at, with a token for a private repository ('' for none). */
async function withReader<T>(
  link: string,
  token: string,
  run: (read: Read, source: PackSource) => Promise<T>,
): Promise<T | { readonly error: string }> {
  const source = parsePackLink(link);
  if (source === null) return NOT_A_LINK;
  const secret = token.trim() === '' ? null : token.trim();
  try {
    return await run(createReader(source, secret), source);
  } catch (error) {
    if (error instanceof PackError) return { error: error.message };
    throw error;
  }
}

/** Reads the pack.json of the folder a link points at. */
export const downloadManifest = (link: string, token = ''): Promise<ManifestDownload> =>
  withReader(link, token, async (read, source) => ({
    source: packId(source),
    manifest: await readManifest(read),
  }));

/** Reads one file of that folder, checking it's what it should be. */
export const downloadFile = (
  link: string,
  token: string,
  path: string,
  kind: FileKind,
): Promise<FileDownload> =>
  withReader(link, token, async read => ({ url: await readFile(read, path, kind) }));
