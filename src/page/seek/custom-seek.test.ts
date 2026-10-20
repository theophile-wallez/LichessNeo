import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import type { CustomSeek } from '#shared/custom-seek.ts';
import { customSeek } from './custom-seek.ts';
import type { LobbySeekOptions } from './lobby-seek.ts';

// The lobby seeks made, each with whether it was cancelled.
const seeks = vi.hoisted((): { options: LobbySeekOptions; cancelled: boolean }[] => []);

vi.mock('./lobby-seek.ts', () => ({
  seekNextGame: (options: LobbySeekOptions) => {
    const made = { options, cancelled: false };
    seeks.push(made);
    return { cancel: () => (made.cancelled = true) };
  },
}));

const SEEK: CustomSeek = { variant: 'chess960', minutes: 3, increment: 2, rated: true };

// What the content script would post, and what the page told it back.
const ask = (seek: CustomSeek | null): void => {
  window.dispatchEvent(
    new MessageEvent('message', { data: { type: 'ln-ext:custom-seek', seek }, source: window }),
  );
};

let states: unknown[];
let assign: MockInstance<(url: string | URL) => void>;

beforeAll(() => customSeek.start());

beforeEach(() => {
  seeks.length = 0;
  states = [];
  vi.spyOn(window, 'postMessage').mockImplementation((data: unknown) => {
    states.push(data);
  });
  assign = vi.spyOn(location, 'assign').mockImplementation(() => {});
  document.body.dataset.socketDomains = 'socket1.lichess.org';
});

afterEach(() => {
  ask(null);
  vi.restoreAllMocks();
});

const SEEKING = { type: 'ln-ext:custom-seek-state', seeking: true };
const STOPPED = { type: 'ln-ext:custom-seek-state', seeking: false };

describe("a home card's seek", () => {
  it('seeks the game in the lobby on a socket of its own, and says so', () => {
    ask(SEEK);
    expect(seeks).toHaveLength(1);
    const options = seeks[0]?.options;
    expect(options?.request).toEqual({ kind: 'hook', seek: SEEK });
    expect(options?.url).toMatch(/^wss:\/\/socket1\.lichess\.org\/lobby\/socket\/v5\?sri=/);
    expect(states).toEqual([SEEKING]);
    options?.onPaired({ url: '/abcd1234wxyz', cookie: null });
    expect(assign).toHaveBeenCalledWith('/abcd1234wxyz');
  });

  it('stops when asked, and seeks one game at a time', () => {
    ask(SEEK);
    ask({ ...SEEK, variant: 'horde' });
    expect(seeks.map(({ cancelled }) => cancelled)).toEqual([true, false]);
    ask(null);
    expect(seeks.map(({ cancelled }) => cancelled)).toEqual([true, true]);
    expect(states).toEqual([SEEKING, SEEKING, STOPPED]);
  });

  it("opens Lichess's game setup with the game filled in when the seek fails", () => {
    ask(SEEK);
    seeks[0]?.options.onFailed();
    expect(states).toEqual([SEEKING, STOPPED]);
    expect(assign).toHaveBeenCalledWith(
      '/?variant=chess960&time=realTime&minutesPerSide=3&increment=2&gameMode=rated#hook',
    );
  });

  it('opens it at once when the page names no socket', () => {
    delete document.body.dataset.socketDomains;
    ask(SEEK);
    expect(seeks).toEqual([]);
    expect(assign).toHaveBeenCalledOnce();
  });

  it('is cancelled when the page is left', () => {
    ask(SEEK);
    window.dispatchEvent(new Event('pagehide'));
    expect(seeks[0]?.cancelled).toBe(true);
  });

  it("ignores another window's message, and a game out of shape", () => {
    window.dispatchEvent(
      new MessageEvent('message', { data: { type: 'ln-ext:custom-seek', seek: SEEK } }),
    );
    ask({ ...SEEK, minutes: 0, increment: 0 });
    expect(seeks).toEqual([]);
  });
});
