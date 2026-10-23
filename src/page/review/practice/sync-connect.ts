import { z } from 'zod/mini';
import type { Color } from '#shared/chess/types.ts';
import { readStoredJson, removeStored, SessionKey, writeStoredJson } from '#shared/storage.ts';
import { PRACTICE_URL } from '#shared/practice-page.ts';
import {
  consentUrl,
  createStudy,
  exchangeCode,
  listStudies,
  revokeToken,
  type StudyMeta,
} from './study-api.ts';
import { keepSyncState, syncNow } from './sync.ts';

// Turning the studies' copy on: the user's two studies are found by their
// names, so another browser finds those the first made. Missing ones are made
// with a token from Lichess's consent page (OAuth with PKCE, no secret), given
// back once they're made: the page comes back to practice, its address
// carrying the consent's code.

/** The studies' names: not translated, as each browser looks them up by name. */
export const STUDY_NAMES: Readonly<Record<Color, string>> = {
  white: 'Lichess Neo · White repertoire',
  black: 'Lichess Neo · Black repertoire',
};

const PendingSchema = z.object({
  verifier: z.string(),
  state: z.string(),
  found: z.object({ white: z.optional(z.string()), black: z.optional(z.string()) }),
});

type Found = z.infer<typeof PendingSchema>['found'];

/** Where the consent page sends the user back: the practice page's board, without its hash. */
const redirectUri = (): string => `${location.origin}/analysis`;

const base64Url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');

const randomText = (): string => base64Url(crypto.getRandomValues(new Uint8Array(32)));

function pending(): z.infer<typeof PendingSchema> | null {
  try {
    return readStoredJson(SessionKey.practiceConnect, PendingSchema, 'session');
  } catch {
    return null;
  }
}

/** The user's studies of practice, by side. */
function foundStudies(studies: readonly StudyMeta[]): Found {
  const named = (side: Color): string | undefined =>
    studies.find(study => study.name === STUDY_NAMES[side])?.id;
  return { white: named('white'), black: named('black') };
}

/** Starts the copy, off the studies of both sides. */
async function begin(white: string, black: string): Promise<void> {
  keepSyncState({ studies: { white, black }, dirty: [] });
  await syncNow();
}

/**
 * Turns the copy on for the signed-in `user`: at once if both studies are
 * there, else through Lichess's consent page, which leaves the page.
 */
export async function connect(user: string): Promise<void> {
  const found = foundStudies(await listStudies(user));
  if (found.white && found.black) {
    await begin(found.white, found.black);
    return;
  }
  const verifier = randomText();
  const state = `ln-ext-${randomText()}`;
  writeStoredJson(SessionKey.practiceConnect, { verifier, state, found }, 'session');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  location.assign(consentUrl(base64Url(new Uint8Array(digest)), state, redirectUri()));
}

/** This page is the consent page's answer to ours. */
export function isConsentReturn(): boolean {
  const state = new URLSearchParams(location.search).get('state');
  return state !== null && state === pending()?.state;
}

/** Makes the studies missing with the consent's token, then gives the token back. */
async function makeStudies(code: string, verifier: string, found: Found): Promise<void> {
  const token = await exchangeCode(code, verifier, redirectUri());
  let studies: { white: string; black: string };
  try {
    studies = {
      white: found.white ?? (await createStudy(token, STUDY_NAMES.white)),
      black: found.black ?? (await createStudy(token, STUDY_NAMES.black)),
    };
  } finally {
    await revokeToken(token);
  }
  await begin(studies.white, studies.black);
}

/** Ends the consent's round trip: the page takes its address back, and the copy starts. */
export async function finishConnect(): Promise<void> {
  const request = pending();
  const code = new URLSearchParams(location.search).get('code');
  removeStored(SessionKey.practiceConnect, 'session');
  history.replaceState(history.state, '', PRACTICE_URL);
  // Refused on the consent page: no code, and nothing to do.
  if (request && code) await makeStudies(code, request.verifier, request.found);
}
