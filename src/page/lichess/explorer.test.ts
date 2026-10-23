import { describe, expect, it, vi } from 'vitest';
import { Explorer, type ExplorerDb, isExplorer } from './explorer.ts';

const DATA = {
  white: 10,
  draws: 5,
  black: 3,
  moves: [{ uci: 'e2e4', san: 'e4', white: 10, draws: 5, black: 3, opening: null }],
  opening: { eco: 'B00', name: "King's Pawn Game" },
};

/** Lichess's explorer controller, its props called with a value to set it. */
function fakeExplorer(state: { db?: unknown; loading?: boolean; current?: unknown } = {}) {
  let db = state.db ?? 'masters';
  let color = 'white';
  let ratings: unknown = [1600, 1800];
  const reload = vi.fn<() => void>();
  const selectPlayer = vi.fn<(name: string) => void>();
  const controller = {
    isAuth: () => true,
    enabled: () => true,
    loading: () => state.loading ?? false,
    failing: () => false,
    current: () => state.current ?? DATA,
    reload,
    opts: { endpoint: 'https://explorer.lichess.ovh' },
    config: {
      selectPlayer,
      data: {
        db: (value?: ExplorerDb) => (value === undefined ? db : (db = value)),
        color: (value?: string) => (value === undefined ? color : (color = value)),
        rating: (value?: unknown) => (value === undefined ? ratings : (ratings = value)),
        playerName: { value: () => 'Alice' },
      },
    },
  };
  return { controller, reload, selectPlayer };
}

describe('Explorer', () => {
  it('reads the explorer’s state', () => {
    const { controller } = fakeExplorer();
    expect(isExplorer(controller)).toBe(true);
    const explorer = new Explorer(controller);
    expect([explorer.signedIn, explorer.enabled, explorer.busy, explorer.failing]).toEqual([
      true,
      true,
      false,
      false,
    ]);
    expect(explorer.source).toEqual({ db: 'masters', player: 'Alice', color: 'white' });
    expect(explorer.endpoint).toBe('https://explorer.lichess.ovh');
    expect(explorer.current()).toEqual(DATA);
  });

  it('knows nothing of an explorer without its members', () => {
    const explorer = new Explorer({});
    expect([explorer.signedIn, explorer.enabled, explorer.busy]).toEqual([false, false, false]);
    expect(explorer.source).toBeNull();
    expect(explorer.ratings).toEqual([]);
    expect(explorer.endpoint).toBeNull();
    expect(explorer.current()).toBeNull();
    expect(() => explorer.selectBook('masters', 'white')).not.toThrow();
  });

  it('has found nothing while it looks, or for a tablebase’s answer', () => {
    expect(new Explorer(fakeExplorer({ loading: true }).controller).current()).toBeNull();
    const tablebase = { checkmate: false, moves: [{ uci: 'e2e4', dtz: 5 }] };
    expect(new Explorer(fakeExplorer({ current: tablebase }).controller).current()).toBeNull();
  });

  it('reads no source from a database it doesn’t know', () => {
    expect(new Explorer(fakeExplorer({ db: 'tablebase' }).controller).source).toBeNull();
  });

  it('picks a database, and looks the position up again', () => {
    const { controller, reload, selectPlayer } = fakeExplorer();
    const explorer = new Explorer(controller);
    explorer.selectBook('lichess', 'black');
    expect(explorer.source).toMatchObject({ db: 'lichess', color: 'white' });
    expect(reload).toHaveBeenCalledTimes(1);
    explorer.selectBook('player', 'black');
    expect(selectPlayer).toHaveBeenCalledWith('me');
    expect(explorer.source?.color).toBe('black');
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('reads and sets the rating groups of Lichess’s players', () => {
    const { controller, reload } = fakeExplorer();
    const explorer = new Explorer(controller);
    expect(explorer.ratings).toEqual([1600, 1800]);
    explorer.setRatings([2000, 2200]);
    expect(explorer.ratings).toEqual([2000, 2200]);
    expect(reload).toHaveBeenCalledTimes(1);
    controller.config.data.rating('none');
    expect(explorer.ratings).toEqual([]);
  });
});
