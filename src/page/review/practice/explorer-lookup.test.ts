import { describe, expect, it } from 'vitest';
import { Explorer } from '#page/lichess/explorer.ts';
import { fakeApi, ndjson, text } from '#page/review/fixtures/fake-api.ts';
import { explorerData } from '#page/review/fixtures/practice.ts';
import { START_FEN } from '#shared/chess/fen.ts';
import { mastersAfter } from './explorer-lookup.ts';

const EXPLORER = new Explorer({ opts: { endpoint: 'https://explorer.lichess.ovh' } });
const AFTER_E4 = explorerData([['c5', 'c7c5', 50, 'Sicilian Defense']], "King's Pawn Game");

describe('mastersAfter', () => {
  it('asks the masters’ database for the moves from the start, with the session', async () => {
    const asked = fakeApi([[/\/masters\?/, () => ndjson([AFTER_E4])]]);
    expect(await mastersAfter(EXPLORER, ['e2e4'])).toEqual(AFTER_E4);
    const [request] = asked;
    const url = new URL(request?.url ?? '');
    expect(url.origin + url.pathname).toBe('https://explorer.lichess.ovh/masters');
    expect(url.searchParams.get('fen')).toBe(START_FEN);
    expect(url.searchParams.get('play')).toBe('e2e4');
    expect(url.searchParams.get('topGames')).toBe('0');
    expect(request?.init?.credentials).toBe('include');
  });

  it('reads the last line of an answer that streams in', async () => {
    const partial = explorerData([['c5', 'c7c5', 10]]);
    fakeApi([[/masters/, () => ndjson([partial, AFTER_E4])]]);
    expect((await mastersAfter(EXPLORER, ['e2e4', 'c7c5']))?.moves[0]?.white).toBe(50);
  });

  it('keeps an endpoint’s own path', async () => {
    const asked = fakeApi([[/masters/, () => ndjson([AFTER_E4])]]);
    await mastersAfter(new Explorer({ opts: { endpoint: 'https://lichess.org/explorer/' } }), []);
    expect(asked[0]?.url).toMatch(/^https:\/\/lichess\.org\/explorer\/masters\?/);
  });

  it('is null without an endpoint, on an error, or for an answer of another shape', async () => {
    const asked = fakeApi([[/masters/, () => text('', 401)]]);
    expect(await mastersAfter(new Explorer({}), ['e2e4'])).toBeNull();
    expect(asked).toHaveLength(0);
    expect(await mastersAfter(EXPLORER, ['e2e4'])).toBeNull();
    fakeApi([[/masters/, () => text('{"moves":"none"}')]]);
    expect(await mastersAfter(EXPLORER, ['e2e4'])).toBeNull();
    fakeApi([[/masters/, () => text('not json')]]);
    expect(await mastersAfter(EXPLORER, ['e2e4'])).toBeNull();
  });
});
