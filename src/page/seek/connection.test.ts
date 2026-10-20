import { afterEach, describe, expect, it, vi } from 'vitest';
import { openGame, socketUrl } from './connection.ts';

afterEach(() => {
  vi.restoreAllMocks();
  delete document.body.dataset.socketDomains;
});

describe("a seek's connection", () => {
  it("opens on one of Lichess's socket domains, with an sri of its own", () => {
    document.body.dataset.socketDomains = 'socket1.lichess.org,socket2.lichess.org';
    vi.spyOn(Math, 'random').mockReturnValue(0.6);
    const url = new URL(socketUrl() ?? '');
    expect(`${url.protocol}//${url.host}${url.pathname}`).toBe(
      'wss://socket2.lichess.org/lobby/socket/v5',
    );
    expect(url.searchParams.get('sri')).toMatch(/^[0-9a-z]+$/);
    expect(url.searchParams.get('from')).toBe('website');
  });

  it('has none when the page names no socket domain', () => {
    expect(socketUrl()).toBeNull();
    document.body.dataset.socketDomains = '';
    expect(socketUrl()).toBeNull();
  });

  it('goes to the game paired, owned through its cookie by an anonymous player', () => {
    const assign = vi.spyOn(location, 'assign').mockImplementation(() => {});
    openGame({ url: 'abcd1234wxyz', cookie: { name: 'rk2', value: 'v1', maxAge: 100 } });
    expect(assign).toHaveBeenCalledWith('/abcd1234wxyz');
    expect(document.cookie).toContain('rk2=v1');
    openGame({ url: '/wxyz9876abcd', cookie: null });
    expect(assign).toHaveBeenLastCalledWith('/wxyz9876abcd');
  });
});
