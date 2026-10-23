import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';

// Lichess's study routes, as practice uses them from the page, signed in:
// the session lists the user's studies, reads a private one's PGN, adds
// chapters and rewrites a chapter's moves. Creating a private, named study
// takes an OAuth token (Lichess's consent page, once): the session's route
// makes an unlisted one, named after the user.

const StudyListSchema = z.object({ id: z.string(), name: z.string() });

const TokenSchema = z.object({ access_token: z.string() });

const CreatedSchema = z.object({ id: z.string() });

export type StudyMeta = z.infer<typeof StudyListSchema>;

/** The app Lichess's consent page names, and the scope it asks. */
const CLIENT_ID = 'lichess-neo';
const SCOPE = 'study:write';

async function ok(response: Response, what: string): Promise<Response> {
  if (!response.ok) throw new Error(`${what}: ${response.status}`);
  return response;
}

/** The user's studies, private ones too: Lichess lists them to their owner. */
export async function listStudies(user: string): Promise<StudyMeta[]> {
  const response = await ok(
    await fetch(`/api/study/by/${encodeURIComponent(user)}`, { cache: 'no-store' }),
    'Study list',
  );
  return (await response.text())
    .split('\n')
    .flatMap(line => parseJson(line, StudyListSchema) ?? []);
}

/** A study's chapters as PGN, with their comments and variations. */
export async function exportStudy(id: string): Promise<string> {
  // The API's route reads no session, so a private study is the site's to export.
  const url = `/study/${id}.pgn?comments=true&variations=true&clocks=false&orientation=true`;
  return (await ok(await fetch(url, { cache: 'no-store' }), 'Study export')).text();
}

/** Adds a chapter of `pgn` to the study: its first, in place of a new study's empty one. */
export async function importChapter(
  id: string,
  chapter: { name: string; pgn: string; orientation: string },
): Promise<void> {
  const body = new URLSearchParams({
    ...chapter,
    mode: 'normal',
    initial: 'true',
    sticky: 'false',
    isDefaultName: 'false',
  });
  // The site's route asks which socket client sent it, to tell the others.
  await ok(await fetch(`/study/${id}/import-pgn?sri=ln-ext`, { method: 'POST', body }), 'Import');
}

/** Rewrites a chapter's moves, keeping its name and tags. */
export async function replaceChapter(id: string, chapterId: string, pgn: string): Promise<void> {
  const body = new URLSearchParams({ pgn });
  await ok(await fetch(`/api/study/${id}/${chapterId}/moves`, { method: 'POST', body }), 'Rewrite');
}

/** Lichess's consent page, for a token to create studies with. */
export function consentUrl(challenge: string, state: string, redirect: string): string {
  const query = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirect,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPE,
    state,
  });
  return `/oauth?${query}`;
}

/** The token the consent's code stands for. */
export async function exchangeCode(
  code: string,
  verifier: string,
  redirect: string,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
    redirect_uri: redirect,
    client_id: CLIENT_ID,
  });
  const response = await ok(await fetch('/api/token', { method: 'POST', body }), 'Token');
  const token = parseJson(await response.text(), TokenSchema);
  if (!token) throw new Error('Token: no access token');
  return token.access_token;
}

/** Creates a private study named `name`, which only its owner sees or uses. */
export async function createStudy(token: string, name: string): Promise<string> {
  const body = new URLSearchParams({
    name,
    visibility: 'private',
    computer: 'owner',
    explorer: 'owner',
    cloneable: 'owner',
    shareable: 'owner',
    chat: 'nobody',
  });
  const headers = { Authorization: `Bearer ${token}` };
  const response = await ok(await fetch('/api/study', { method: 'POST', headers, body }), 'Create');
  const created = parseJson(await response.text(), CreatedSchema);
  if (!created) throw new Error('Create: no study id');
  return created.id;
}

/** Gives the token back: practice keeps none. */
export async function revokeToken(token: string): Promise<void> {
  await fetch('/api/token', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
}
