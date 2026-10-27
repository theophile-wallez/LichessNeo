import { apiFileUrl, fileUrl, MANIFEST_FILE, type PackSource } from './source.ts';

// Reads a pack's files from GitHub: its raw host for a public repository, its
// API with the user's token for a private one. GitHub's files allow any
// origin, so this needs no host permission.

const KB = 1024;

/** A failure, worded for the user. */
export class PackError extends Error {}

const size = (bytes: number): string =>
  bytes >= KB * KB ? `${bytes / KB / KB} MB` : `${bytes / KB} KB`;

export const tooBig = (what: string, maxBytes: number): PackError =>
  new PackError(`${what} is over ${size(maxBytes)}.`);

/** Reads one of the pack's files, at most `maxBytes` of it. */
export type Read = (path: string, maxBytes: number) => Promise<Uint8Array>;

function request(source: PackSource, path: string, token: string | null): Promise<Response> {
  if (token === null)
    return fetch(fileUrl(source, path), { credentials: 'omit', cache: 'no-store' });
  return fetch(apiFileUrl(source, path), {
    credentials: 'omit',
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw+json' },
  });
}

function refusal(status: number, path: string, token: string | null): PackError {
  if (status === 401) return new PackError('GitHub turned the token down.');
  if (status === 404 && token !== null)
    return new PackError(`${path} is not there, or the token can't read it.`);
  if (status === 404 && path === MANIFEST_FILE)
    return new PackError(`There is no ${MANIFEST_FILE} there. A private repository needs a token.`);
  if (status === 404) return new PackError(`${path} is not there.`);
  return new PackError(`GitHub answered ${status} for ${path}.`);
}

// Counted as it comes: GitHub gzips text files, so their Content-Length says
// nothing of what they unpack to.
async function readBody(response: Response, path: string, maxBytes: number): Promise<Uint8Array> {
  const reader = response.body?.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  let chunk = await reader?.read();
  while (chunk && !chunk.done) {
    length += chunk.value.length;
    if (length > maxBytes) {
      await reader?.cancel();
      throw tooBig(path, maxBytes);
    }
    chunks.push(chunk.value);
    chunk = await reader?.read();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of chunks) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return bytes;
}

/** Reads the files of `source`. */
export function createReader(source: PackSource, token: string | null): Read {
  return async (path, maxBytes) => {
    let response: Response;
    try {
      response = await request(source, path, token);
    } catch {
      throw new PackError('GitHub could not be reached.');
    }
    if (!response.ok) throw refusal(response.status, path, token);
    try {
      return await readBody(response, path, maxBytes);
    } catch (error) {
      if (error instanceof PackError) throw error;
      throw new PackError(`${path} could not be read.`);
    }
  };
}
