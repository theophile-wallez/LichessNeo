// Where a pack is read from: a folder of a GitHub repository, the one that
// holds its pack.json, named by whichever link to it a user pastes.

export const MANIFEST_FILE = 'pack.json';

export interface PackSource {
  readonly owner: string;
  readonly repo: string;
  /** A branch, a tag or a commit; HEAD for the default branch. */
  readonly ref: string;
  /** The folder's path, '' for the repository's root, else ending in a slash. */
  readonly folder: string;
}

const NAME = /^[\w.-]+$/;
const RAW_HOST = 'https://raw.githubusercontent.com';
const API_HOST = 'https://api.github.com';

// Checked once decoded: an encoded `/` (%2F) would otherwise climb out of the
// repository, on GitHub's hosts, with a token if there is one.
const isSegment = (part: string): boolean =>
  part !== '' && part !== '.' && part !== '..' && !/[/\\?#%]/.test(part);

function decodeParts(pathname: string): string[] | null {
  try {
    return pathname
      .split('/')
      .filter(part => part !== '')
      .map(part => decodeURIComponent(part));
  } catch {
    return null;
  }
}

function source(
  owner: string,
  repo: string,
  refParts: readonly string[],
  path: readonly string[],
): PackSource | null {
  // A link to the pack.json itself names its folder.
  const folderParts = path.at(-1) === MANIFEST_FILE ? path.slice(0, -1) : path;
  const name = repo.replace(/\.git$/, '');
  if (!NAME.test(owner) || !NAME.test(name) || refParts.length === 0) return null;
  // The owner and the repository too: `...git` is `..` once stripped.
  if (![owner, name, ...refParts, ...folderParts].every(isSegment)) return null;
  const folder = folderParts.map(part => `${part}/`).join('');
  return { owner, repo: name, ref: refParts.join('/'), folder };
}

// github.com/<owner>/<repo>[/tree|blob/<ref>/<path>]: a ref with a slash in it
// can't be told from the path, so a link names a one-word branch, a tag or a commit.
function fromGithub(parts: readonly string[]): PackSource | null {
  const [owner = '', repo = '', kind, ref = '', ...path] = parts;
  if (kind === undefined) return source(owner, repo, ['HEAD'], []);
  if (kind !== 'tree' && kind !== 'blob') return null;
  return source(owner, repo, [ref], path);
}

// raw.githubusercontent.com/<owner>/<repo>/<ref>/<path>, the ref as refs/heads/<branch> too.
function fromRaw(parts: readonly string[]): PackSource | null {
  const [owner = '', repo = '', ...rest] = parts;
  const refLength = rest[0] === 'refs' ? 3 : 1;
  return source(owner, repo, rest.slice(0, refLength), rest.slice(refLength));
}

/** The pack a link points at, or null for a link that isn't to a GitHub folder or file. */
export function parsePackLink(link: string): PackSource | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  const parts = url.protocol === 'https:' ? decodeParts(url.pathname) : null;
  if (parts === null) return null;
  if (url.hostname === 'github.com' || url.hostname === 'www.github.com') return fromGithub(parts);
  if (url.hostname === 'raw.githubusercontent.com') return fromRaw(parts);
  return null;
}

/** A stable id for the pack, so importing it again replaces it. GitHub's names ignore case. */
export const packId = ({ owner, repo, ref, folder }: PackSource): string =>
  `${owner.toLowerCase()}/${repo.toLowerCase()}/${ref}/${folder}`;

// No folder holds a `#` (isSegment), so a pack.json's items can't be taken
// for those of a folder below it.
/** The id of one of a pack.json's boards, piece sets or sound sets, listed under its name. */
export const itemId = (sourceId: string, kind: string, name: string): string =>
  `${sourceId}#${kind}:${name}`;

/** The id of the pack.json the stored pack of that id came from. */
export const sourceIdOf = (id: string): string => id.split('#', 1)[0] ?? id;

const encodedPath = (path: string): string => path.split('/').map(encodeURIComponent).join('/');

/** A file of a public pack, from its path relative to the pack's folder. */
export function fileUrl({ owner, repo, ref, folder }: PackSource, path: string): string {
  return `${RAW_HOST}/${owner}/${repo}/${encodedPath(ref)}/${encodedPath(`${folder}${path}`)}`;
}

/**
 * The same file through GitHub's API, which reads a private repository with a
 * token: the raw files' host turns down a request that carries one.
 */
export function apiFileUrl({ owner, repo, ref, folder }: PackSource, path: string): string {
  const query = ref === 'HEAD' ? '' : `?ref=${encodeURIComponent(ref)}`;
  return `${API_HOST}/repos/${owner}/${repo}/contents/${encodedPath(`${folder}${path}`)}${query}`;
}
