import { describe, expect, it } from 'vitest';
import { fakeApi, ndjson, text } from '#page/review/fixtures/fake-api.ts';
import {
  consentUrl,
  createStudy,
  exchangeCode,
  exportStudy,
  importChapter,
  listStudies,
  replaceChapter,
  revokeToken,
} from './study-api.ts';

describe('reading studies', () => {
  it('lists the user’s studies, skipping a line of another shape', async () => {
    const asked = fakeApi([
      [
        /^\/api\/study\/by\//,
        () =>
          text(
            [
              JSON.stringify({ id: 'abcd1234', name: 'Lichess Neo · White repertoire', likes: 0 }),
              '{"id":5}',
              JSON.stringify({ id: 'efgh5678', name: 'Endgames' }),
            ].join('\n'),
          ),
      ],
    ]);
    expect(await listStudies('Alice Smith')).toEqual([
      { id: 'abcd1234', name: 'Lichess Neo · White repertoire' },
      { id: 'efgh5678', name: 'Endgames' },
    ]);
    expect(asked[0]?.url).toBe('/api/study/by/Alice%20Smith');
    expect(asked[0]?.init?.cache).toBe('no-store');
  });

  it('exports a study through the site’s route, which reads the session', async () => {
    const asked = fakeApi([[/^\/study\/abcd1234\.pgn\?/, () => text('1. e4 *')]]);
    expect(await exportStudy('abcd1234')).toBe('1. e4 *');
    const url = new URL(asked[0]?.url ?? '', 'https://lichess.org');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      comments: 'true',
      variations: 'true',
      clocks: 'false',
      orientation: 'true',
    });
  });

  it('fails on an error, naming the route', async () => {
    fakeApi([]);
    await expect(listStudies('alice')).rejects.toThrow('Study list: 404');
    await expect(exportStudy('abcd1234')).rejects.toThrow('Study export: 404');
  });
});

describe('writing studies', () => {
  it('adds a chapter as the study’s first, telling the socket who sent it', async () => {
    const asked = fakeApi([[/import-pgn/, () => text('')]]);
    await importChapter('abcd1234', { name: 'Italian Game', pgn: '1. e4 *', orientation: 'white' });
    const [request] = asked;
    expect([request?.method, request?.url]).toEqual([
      'POST',
      '/study/abcd1234/import-pgn?sri=ln-ext',
    ]);
    expect(Object.fromEntries(request?.body ?? [])).toEqual({
      name: 'Italian Game',
      pgn: '1. e4 *',
      orientation: 'white',
      mode: 'normal',
      initial: 'true',
      sticky: 'false',
      isDefaultName: 'false',
    });
  });

  it('rewrites a chapter’s moves', async () => {
    const asked = fakeApi([[/moves$/, () => text('{"ok":true}')]]);
    await replaceChapter('abcd1234', 'efgh5678', '1. d4 *');
    expect(asked[0]?.url).toBe('/api/study/abcd1234/efgh5678/moves');
    expect(asked[0]?.body.get('pgn')).toBe('1. d4 *');
    fakeApi([[/moves$/, () => text('', 403)]]);
    await expect(replaceChapter('abcd1234', 'efgh5678', '*')).rejects.toThrow('Rewrite: 403');
  });
});

describe('the consent’s token', () => {
  it('is asked for on Lichess’s consent page, with the challenge', () => {
    const url = new URL(
      consentUrl('challenge', 'ln-ext-state', 'https://lichess.org/analysis'),
      'https://lichess.org',
    );
    expect(url.pathname).toBe('/oauth');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'lichess-neo',
      redirect_uri: 'https://lichess.org/analysis',
      code_challenge_method: 'S256',
      code_challenge: 'challenge',
      scope: 'study:write',
      state: 'ln-ext-state',
    });
  });

  it('is the one the code stands for, and given back', async () => {
    const asked = fakeApi([
      [/^\/api\/token$/, () => ndjson([{ access_token: 'lio_secret', expires_in: 60 }])],
    ]);
    expect(await exchangeCode('code', 'verifier', 'https://lichess.org/analysis')).toBe(
      'lio_secret',
    );
    expect(Object.fromEntries(asked[0]?.body ?? [])).toEqual({
      grant_type: 'authorization_code',
      code: 'code',
      code_verifier: 'verifier',
      redirect_uri: 'https://lichess.org/analysis',
      client_id: 'lichess-neo',
    });
    await revokeToken('lio_secret');
    expect(asked[1]?.method).toBe('DELETE');
    expect(asked[1]?.headers.get('Authorization')).toBe('Bearer lio_secret');
  });

  it('fails when Lichess gives no token', async () => {
    fakeApi([[/token/, () => text('{"error":"invalid_grant"}')]]);
    await expect(exchangeCode('code', 'verifier', '/')).rejects.toThrow('Token: no access token');
    fakeApi([[/token/, () => text('', 400)]]);
    await expect(exchangeCode('code', 'verifier', '/')).rejects.toThrow('Token: 400');
  });
});

describe('createStudy', () => {
  it('creates a private study with the token, for its owner alone', async () => {
    const asked = fakeApi([[/^\/api\/study$/, () => text('{"id":"newstudy"}')]]);
    expect(await createStudy('lio_secret', 'Lichess Neo · Black repertoire')).toBe('newstudy');
    expect(asked[0]?.headers.get('Authorization')).toBe('Bearer lio_secret');
    expect(Object.fromEntries(asked[0]?.body ?? [])).toMatchObject({
      name: 'Lichess Neo · Black repertoire',
      visibility: 'private',
      chat: 'nobody',
    });
  });

  it('fails without the study’s id', async () => {
    fakeApi([[/study$/, () => text('{}')]]);
    await expect(createStudy('lio_secret', 'Mine')).rejects.toThrow('Create: no study id');
  });
});
