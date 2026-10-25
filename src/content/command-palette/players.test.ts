import { afterEach, describe, expect, it, vi } from 'vitest';
import { asksPlayers, fetchPlayers } from './players.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the palette’s players', () => {
  it('asks Lichess from 3 characters of a name, as it answers', () => {
    expect(asksPlayers('dr')).toBe(false);
    expect(asksPlayers(' drn ')).toBe(true);
    expect(asksPlayers('puzzle themes')).toBe(false);
  });

  it('turns Lichess’s answer into profiles, its title and status kept', async () => {
    const fetchPlayersApi = vi.fn<(url: string) => Promise<Response>>(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            result: [{ name: 'DrNykterstein', id: 'drnykterstein', title: 'GM', online: true }],
          }),
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchPlayersApi);
    const [player] = await fetchPlayers('drnyk', new AbortController().signal);
    expect(fetchPlayersApi.mock.calls[0]?.[0]).toBe(
      '/api/player/autocomplete?term=drnyk&object=1&friend=1',
    );
    expect(player).toMatchObject({
      label: 'DrNykterstein',
      title: 'GM',
      online: true,
      href: '/@/DrNykterstein',
      icon: { kind: 'avatar', user: 'DrNykterstein' },
    });
  });

  it('finds none when Lichess fails', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('', { status: 400 })));
    expect(await fetchPlayers('drnyk', new AbortController().signal)).toEqual([]);
  });
});
