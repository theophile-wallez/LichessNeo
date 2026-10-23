import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import { text } from '#page/review/fixtures/fake-api.ts';
import { fakeStudies } from '#page/review/fixtures/fake-studies.ts';
import { connect, finishConnect, isConsentReturn, STUDY_NAMES } from './sync-connect.ts';

const SYNC = 'ln-ext-practice-sync';
const PENDING = 'ln-ext-practice-connect';

const stored = (): unknown => JSON.parse(localStorage.getItem(SYNC) ?? 'null');

const PendingSchema = z.object({
  verifier: z.string(),
  state: z.string(),
  found: z.record(z.string(), z.string()),
});

const pending = (): z.infer<typeof PendingSchema> | null =>
  parseJson(sessionStorage.getItem(PENDING), PendingSchema);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  history.replaceState(null, '', '/analysis#ln-ext-practice');
});

afterEach(() => {
  history.replaceState(null, '', '/');
});

describe('connect', () => {
  it('starts the copy at once on the user’s two studies, found by their names', async () => {
    const lichess = fakeStudies({
      other123: 'Endgames',
      white123: STUDY_NAMES.white,
      black123: STUDY_NAMES.black,
    });
    await connect('alice');
    expect(stored()).toEqual({
      studies: { white: 'white123', black: 'black123' },
      dirty: [],
      pruned: [],
    });
    expect(lichess.asked.map(request => request.url.split('?')[0])).toEqual([
      '/api/study/by/alice',
      '/study/white123.pgn',
      '/study/black123.pgn',
    ]);
  });

  it('goes to Lichess’s consent page for a study missing, with a challenge of its secret', async () => {
    fakeStudies({ white123: STUDY_NAMES.white });
    const assign = vi.spyOn(location, 'assign').mockImplementation(() => {});
    await connect('alice');
    const request = pending();
    expect(request?.found).toEqual({ white: 'white123' });
    expect(request?.state).toMatch(/^ln-ext-[\w-]{43}$/);
    expect(request?.verifier).toMatch(/^[\w-]{43}$/);
    const url = new URL(String(assign.mock.calls[0]?.[0]), location.origin);
    expect(url.pathname).toBe('/oauth');
    expect(url.searchParams.get('state')).toBe(request?.state);
    expect(url.searchParams.get('redirect_uri')).toBe(`${location.origin}/analysis`);
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(request?.verifier),
    );
    const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replaceAll('+', '-')
      .replaceAll('/', '_')
      .replace(/=+$/, '');
    expect(url.searchParams.get('code_challenge')).toBe(challenge);
    expect(stored()).toBeNull();
  });
});

/** Lichess's studies, with its token routes and a new study made as `black123`. */
function lichessWithToken(create: () => Response = () => text('{"id":"black123"}')) {
  return fakeStudies({ white123: STUDY_NAMES.white, black123: STUDY_NAMES.black }, [
    [
      /^\/api\/token$/,
      ({ method }) => text(method === 'POST' ? '{"access_token":"lio_token"}' : ''),
    ],
    [/^\/api\/study$/, create],
  ]);
}

describe('the consent’s return', () => {
  const PENDING_REQUEST = {
    verifier: 'verifier',
    state: 'ln-ext-abc',
    found: { white: 'white123' },
  };

  it('is this page when its state is the one asked with', () => {
    expect(isConsentReturn()).toBe(false);
    sessionStorage.setItem(PENDING, JSON.stringify(PENDING_REQUEST));
    history.replaceState(null, '', '/analysis?code=thecode&state=ln-ext-abc');
    expect(isConsentReturn()).toBe(true);
    history.replaceState(null, '', '/analysis?code=thecode&state=ln-ext-other');
    expect(isConsentReturn()).toBe(false);
  });

  it('makes the study missing, gives the token back, and starts the copy', async () => {
    const lichess = lichessWithToken();
    sessionStorage.setItem(PENDING, JSON.stringify(PENDING_REQUEST));
    history.replaceState(null, '', '/analysis?code=thecode&state=ln-ext-abc');
    await finishConnect();
    expect(location.pathname + location.search + location.hash).toBe('/analysis#ln-ext-practice');
    expect(pending()).toBeNull();
    const [token, create, revoke] = lichess.asked;
    expect(token?.body.get('code')).toBe('thecode');
    expect(token?.body.get('code_verifier')).toBe('verifier');
    expect(create?.body.get('name')).toBe(STUDY_NAMES.black);
    expect(create?.headers.get('Authorization')).toBe('Bearer lio_token');
    expect([revoke?.method, revoke?.url]).toEqual(['DELETE', '/api/token']);
    expect(stored()).toMatchObject({ studies: { white: 'white123', black: 'black123' } });
  });

  it('gives the token back when a study can’t be made', async () => {
    const lichess = lichessWithToken(() => text('', 500));
    sessionStorage.setItem(PENDING, JSON.stringify(PENDING_REQUEST));
    history.replaceState(null, '', '/analysis?code=thecode&state=ln-ext-abc');
    await expect(finishConnect()).rejects.toThrow('Create: 500');
    expect(lichess.asked.at(-1)?.method).toBe('DELETE');
    expect(stored()).toBeNull();
  });

  it('does nothing more once the user refused', async () => {
    const lichess = lichessWithToken();
    sessionStorage.setItem(PENDING, JSON.stringify(PENDING_REQUEST));
    history.replaceState(null, '', '/analysis?error=access_denied&state=ln-ext-abc');
    await finishConnect();
    expect(lichess.asked).toEqual([]);
    expect(pending()).toBeNull();
    expect(location.search).toBe('');
  });
});
