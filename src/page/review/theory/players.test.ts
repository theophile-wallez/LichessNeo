import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as PlayersModule from './players.ts';
import { practiceBoard } from '#page/review/fixtures/practice.ts';

const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const ENDPOINT = 'https://explorer.lichess.ovh';

type Players = typeof PlayersModule;

// Each test looks positions up anew: the module keeps what it found for the page.
async function freshPlayers(): Promise<Players> {
  vi.resetModules();
  return import('./players.ts');
}

const answer = (games: number) => ({
  white: games,
  draws: 0,
  black: 0,
  moves: [{ uci: 'e7e5', san: 'e5', white: games, draws: 0, black: 0 }],
});

// The explorer's answer comes in parts, as it finds it: the last line holds it all.
const ndjson = (games: number): Response =>
  new Response(`${JSON.stringify(answer(1))}\n${JSON.stringify(answer(games))}\n`);

function board(signedIn = true) {
  const { ctrl, analysis } = practiceBoard([]);
  Object.assign(ctrl.explorer, { opts: { endpoint: ENDPOINT }, isAuth: () => signedIn });
  return analysis;
}

const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  fetched.mockReset();
  vi.stubGlobal('fetch', fetched);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('groupsAround', () => {
  it.each([
    [undefined, [1200, 1400, 1600, 1800, 2000]],
    [300, [400, 1000]],
    [400, [400, 1000]],
    [1050, [400, 1000]],
    [1150, [1000, 1200]],
    [1450, [1200, 1400]],
    [1500, [1400, 1600]],
    [2400, [2200, 2500]],
    [2500, [2200, 2500]],
    [2900, [2200, 2500]],
  ])('takes %s’s group and the nearest one', async (rating, groups) => {
    const { groupsAround } = await freshPlayers();
    expect(groupsAround(rating)).toEqual(groups);
  });
});

describe('askPlayers', () => {
  it('reads the last line of the explorer’s answer for the mover’s level', async () => {
    const { askPlayers, playersAt } = await freshPlayers();
    fetched.mockResolvedValue(ndjson(500));
    const loaded = vi.fn<() => void>();
    askPlayers(board(), AFTER_E4, 1500, loaded);
    await vi.waitFor(() => expect(loaded).toHaveBeenCalledOnce());
    const [url = '', init] = fetched.mock.calls[0] ?? [];
    const asked = new URL(url);
    expect(asked.origin + asked.pathname).toBe(`${ENDPOINT}/lichess`);
    expect(asked.searchParams.get('ratings')).toBe('1400,1600');
    expect(asked.searchParams.get('fen')).toBe(AFTER_E4);
    expect(init?.credentials).toBe('include');
    expect(playersAt(AFTER_E4, 1500)).toEqual({ data: answer(500), rated: true });
    expect(playersAt(AFTER_E4, undefined)).toBeNull();
  });

  it('asks a position once per level, whatever its move number', async () => {
    const { askPlayers, playersAt } = await freshPlayers();
    fetched.mockImplementation(async () => ndjson(800));
    const loaded = vi.fn<() => void>();
    const analysis = board();
    askPlayers(analysis, AFTER_E4, 1500, loaded);
    askPlayers(analysis, AFTER_E4.replace(/ 0 1$/, ' 4 9'), 1550, loaded);
    askPlayers(analysis, AFTER_E4, undefined, loaded);
    await vi.waitFor(() => expect(loaded).toHaveBeenCalledTimes(2));
    expect(fetched).toHaveBeenCalledTimes(2);
    expect(playersAt(AFTER_E4, undefined)).toEqual({ data: answer(800), rated: false });
  });

  it('asks again a while after a failed lookup, not at once', async () => {
    const { askPlayers, playersAt, RETRY_MS } = await freshPlayers();
    fetched.mockResolvedValueOnce(new Response('', { status: 503 }));
    const loaded = vi.fn<() => void>();
    const analysis = board();
    askPlayers(analysis, AFTER_E4, 1500, loaded);
    await vi.waitFor(() => expect(fetched).toHaveBeenCalledOnce());
    await new Promise(resolve => setTimeout(resolve));
    askPlayers(analysis, AFTER_E4, 1500, loaded);
    expect(fetched).toHaveBeenCalledOnce();
    vi.setSystemTime(Date.now() + RETRY_MS);
    fetched.mockResolvedValueOnce(ndjson(500));
    askPlayers(analysis, AFTER_E4, 1500, loaded);
    await vi.waitFor(() => expect(loaded).toHaveBeenCalledOnce());
    expect(playersAt(AFTER_E4, 1500)).not.toBeNull();
  });

  it('asks nothing signed out: the explorer answers no one then', async () => {
    const { askPlayers } = await freshPlayers();
    askPlayers(board(false), AFTER_E4, 1500, () => undefined);
    expect(fetched).not.toHaveBeenCalled();
  });
});
