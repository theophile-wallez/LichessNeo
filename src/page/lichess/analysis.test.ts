import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeController } from '#page/review/fixtures/fake-lichess.ts';
import { analysis, currentNode } from './analysis.ts';
import { assetUrl } from './assets.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
});

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

function page(options: Partial<Parameters<typeof fakeController>[0]> = {}) {
  const ctrl = fakeController({
    id: 'abcdefgh',
    positions: [
      { ply: 0, fen: START },
      { ply: 1, fen: AFTER_E4, uci: 'e2e4', san: 'e4' },
    ],
    ...options,
  });
  Object.assign(window, { site: { analysis: ctrl } });
  const facade = analysis();
  if (!facade) throw new Error('not a controller');
  return { ctrl, facade };
}

describe('analysis', () => {
  it('is null without a controller, or with something else', () => {
    expect(analysis()).toBeNull();
    Object.assign(window, { site: { analysis: { node: {} } } });
    expect(analysis()).toBeNull();
  });

  it('is the same facade over the same controller', () => {
    const { facade } = page();
    expect(analysis()).toBe(facade);
  });

  it('reads the members Lichess reassigns afresh, keeping the nodes themselves', () => {
    const { ctrl, facade } = page();
    expect(facade.path).toBe('');
    expect(facade.onMainline).toBe(true);
    ctrl.jumpToMain(1);
    expect(facade.node).toBe(ctrl.mainline[1]);
    expect(facade.nodeList).toEqual(ctrl.nodeList);
    expect(facade.nodeAtPath(ctrl.path)).toBe(ctrl.node);
    expect(facade.mainline[0]).toBe(ctrl.tree.root);
  });

  it('throws on a node of another shape', () => {
    const { ctrl, facade } = page();
    Object.assign(ctrl, { node: { id: 3 } });
    expect(() => facade.node).toThrow(/unexpected node/);
  });

  it('reads the game and its players, a malformed field as missing', () => {
    const { facade } = page({
      speed: 'rapid',
      variant: 'chess960',
      players: [
        { color: 'black', user: { username: 'Bob' }, rating: 'high' },
        { color: 'white', ai: 5 },
      ],
    });
    expect(facade.gameId).toBe('abcdefgh');
    expect(facade.chess960).toBe(true);
    expect(facade.data?.game.speed).toBe('rapid');
    expect(facade.players()).toEqual({
      white: { color: 'white', ai: 5 },
      black: { color: 'black', user: { username: 'Bob' } },
    });
  });

  it('knows nothing of a game whose data it can’t read', () => {
    const { ctrl, facade } = page();
    Object.assign(ctrl, { data: { game: {} } });
    expect(facade.data).toBeNull();
    expect(facade.gameId).toBe('');
    expect(facade.players()).toEqual({ white: undefined, black: undefined });
  });

  it('closes Lichess’s tools', () => {
    const { ctrl, facade } = page();
    ctrl.actionMenu(true);
    ctrl.togglePractice(true);
    facade.closeActionMenu();
    facade.stopPractice();
    expect(ctrl.menuOpen).toBe(false);
    expect(ctrl.practice).toBeUndefined();
  });

  it('turns "Learn from your mistakes" on and off, once each', () => {
    const { ctrl, facade } = page({ serverAnalysis: true });
    expect(facade.hasServerAnalysis).toBe(true);
    facade.setRetro(true);
    facade.setRetro(true);
    expect(facade.retroOn).toBe(true);
    expect(ctrl.retro).toBeDefined();
    facade.setRetro(false);
    expect(facade.retroOn).toBe(false);
    expect(page().facade.hasServerAnalysis).toBe(false);
  });

  it('starts practice with the computer once, and drives the free board’s tools', () => {
    const { ctrl, facade } = page();
    const toggle = vi.fn<(on?: boolean) => void>(ctrl.togglePractice);
    const calls: string[] = [];
    Object.assign(ctrl, {
      togglePractice: toggle,
      toggleExplorer: () => calls.push('explorer'),
      flip: () => calls.push('flip'),
      changePgn: (pgn: string, andReload: boolean) => calls.push(`${pgn} ${String(andReload)}`),
    });
    facade.startComputerPractice();
    facade.startComputerPractice();
    expect(toggle.mock.calls).toEqual([[true]]);
    facade.toggleExplorer();
    facade.flip();
    facade.loadLine('1. e4 c5');
    expect(calls).toEqual(['explorer', 'flip', '1. e4 c5 true']);
  });

  it('gives the opening explorer where the page has one', () => {
    const { ctrl, facade } = page();
    Object.assign(ctrl, { explorer: { opts: { endpoint: 'https://explorer.lichess.ovh' } } });
    expect(facade.explorer?.endpoint).toBe('https://explorer.lichess.ovh');
    Object.assign(ctrl, { explorer: 'none' });
    expect(facade.explorer).toBeNull();
  });

  it('plays a move where the page can', () => {
    const { ctrl, facade } = page();
    expect(facade.canPlayUci).toBe(true);
    facade.playUci('e2e4');
    expect(ctrl.path).toBe(ctrl.mainline[1]?.id);
    Object.assign(ctrl, { playUci: undefined });
    expect(facade.canPlayUci).toBe(false);
    facade.playUci('e7e5');
    expect(ctrl.node.ply).toBe(1);
  });

  it('asks the masters database, and reads its answer', async () => {
    const { facade } = page({
      signedIn: true,
      masters: () => ({
        white: 5,
        draws: 2,
        black: 3,
        opening: { name: 'Open', eco: 'C20' },
        moves: [],
      }),
    });
    expect(facade.explorerSignedIn()).toBe(true);
    await expect(facade.fetchMasterOpening(START)).resolves.toEqual({
      white: 5,
      draws: 2,
      black: 3,
      opening: { name: 'Open', eco: 'C20' },
    });
  });

  it('rejects an answer it can’t read, and knows a signed-out user', async () => {
    const { facade } = page({ signedIn: false, masters: () => ({ white: 'many' }) });
    expect(facade.explorerSignedIn()).toBe(false);
    await expect(facade.fetchMasterOpening(START)).rejects.toThrow(/number/);
  });
});

describe('currentNode', () => {
  it('reads the node on the board, with or without the rest of the controller', () => {
    expect(currentNode()).toBeNull();
    const node = { id: '', ply: 0, fen: START, children: [] };
    Object.assign(window, { site: { analysis: { node } } });
    expect(currentNode()).toBe(node);
  });
});

describe('assetUrl', () => {
  it('asks Lichess where its files are, and throws without the helper', () => {
    expect(() => assetUrl('x.js')).toThrow(/asset helper/);
    Object.assign(window, {
      site: {
        asset: {
          url: (path: string, options?: unknown) => `/assets/${path}${options ? '?doc' : ''}`,
        },
      },
    });
    expect(assetUrl('npm/sf.js', { documentOrigin: true })).toBe('/assets/npm/sf.js?doc');
    expect(assetUrl('lifat/nnue/a')).toBe('/assets/lifat/nnue/a');
  });

  it('throws when the helper returns no URL', () => {
    Object.assign(window, { site: { asset: { url: () => 42 } } });
    expect(() => assetUrl('x.js')).toThrow(/returned no URL/);
  });
});
