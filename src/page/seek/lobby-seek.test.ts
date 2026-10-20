import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seekNextGame, type LobbySeekOptions, type SeekRequest } from './lobby-seek.ts';

// Lichess's lobby socket, as the seek sees it.
class FakeSocket extends EventTarget {
  readyState: number = WebSocket.CONNECTING;
  readonly sent: string[] = [];
  closed = false;

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    this.readyState = WebSocket.CLOSED;
  }

  open(): void {
    this.readyState = WebSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  receive(data: string): void {
    this.dispatchEvent(new MessageEvent('message', { data }));
  }
}

let socket: FakeSocket;
let events: string[];

const POOL: SeekRequest = { kind: 'pool', member: { id: '2+1', blocking: 'bob' } };

// The lobby's answer to a seek like a game, and the seeks asked for.
let hookAccepted: boolean;
let hooks: string[];

function seek(request: SeekRequest = POOL): ReturnType<typeof seekNextGame> {
  const options: LobbySeekOptions = {
    url: 'wss://socket.test/lobby/socket/v5?sri=abc123&from=website',
    request,
    onOpen: () => events.push('open'),
    onPaired: ({ url, cookie }) => events.push(`paired ${url}${cookie ? ` ${cookie.name}` : ''}`),
    onFailed: () => events.push('failed'),
    connect: () => socket,
    hookLike: (sri, gameId) => {
      hooks.push(`${sri} ${gameId}`);
      return Promise.resolve(hookAccepted);
    },
    hook: (sri, { variant, minutes, increment }) => {
      hooks.push(`${sri} ${variant} ${minutes}+${increment}`);
      return Promise.resolve(hookAccepted);
    },
  };
  return seekNextGame(options);
}

beforeEach(() => {
  vi.useFakeTimers();
  socket = new FakeSocket();
  events = [];
  hookAccepted = true;
  hooks = [];
});

afterEach(() => vi.useRealTimers());

const POOL_IN = '{"t":"poolIn","d":{"id":"2+1","blocking":"bob"}}';

describe('a seek in a pool', () => {
  it('joins once the socket opens, pings after each pong, and joins again every 10s', () => {
    seek();
    expect(socket.sent).toEqual([]);
    socket.open();
    expect(socket.sent).toEqual(['p', POOL_IN]);
    expect(events).toEqual(['open']);
    socket.receive('0');
    vi.advanceTimersByTime(2500);
    expect(socket.sent).toEqual(['p', POOL_IN, 'p']);
    socket.receive('0');
    vi.advanceTimersByTime(7500);
    expect(socket.sent.filter(data => data === POOL_IN)).toHaveLength(2);
  });

  it("opens the game it's paired in, and lets the socket go", () => {
    seek();
    socket.open();
    socket.receive('{"t":"redirect","d":{"id":"abcd1234","url":"/abcd1234wxyz"}}');
    expect(events).toEqual(['open', 'paired /abcd1234wxyz']);
    expect(socket.closed).toBe(true);
    socket.dispatchEvent(new Event('close'));
    expect(events).toHaveLength(2);
  });

  it('leaves the pool when cancelled', () => {
    const pool = seek();
    socket.open();
    pool.cancel();
    expect(socket.sent.at(-1)).toBe('{"t":"poolOut","d":"2+1"}');
    expect(socket.closed).toBe(true);
    expect(events).toEqual(['open']);
  });

  it('fails when the socket closes, or stays silent past a ping', () => {
    seek();
    socket.dispatchEvent(new Event('close'));
    expect(events).toEqual(['failed']);
    socket = new FakeSocket();
    events = [];
    seek();
    socket.open();
    vi.advanceTimersByTime(9000);
    expect(events).toEqual(['open', 'failed']);
  });
});

describe('a seek like a game', () => {
  const LIKE: SeekRequest = { kind: 'like', gameId: 'abcd1234' };

  it('asks the lobby for it once the socket opens, for this socket only', async () => {
    seek(LIKE);
    expect(hooks).toEqual([]);
    socket.open();
    expect(hooks).toEqual(['abc123 abcd1234']);
    expect(socket.sent).toEqual(['p']);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(hooks).toHaveLength(1);
  });

  it('opens the game it is paired in, with the cookie an anonymous player gets', () => {
    seek(LIKE);
    socket.open();
    socket.receive(
      '{"t":"redirect","d":{"id":"wxyz9876","url":"/wxyz9876abcd","cookie":{"name":"rk2","value":"v","maxAge":100}}}',
    );
    expect(events).toEqual(['open', 'paired /wxyz9876abcd rk2']);
  });

  it('cancels the seek when cancelled, and fails when the lobby refuses it', async () => {
    const like = seek(LIKE);
    socket.open();
    like.cancel();
    expect(socket.sent.at(-1)).toBe('{"t":"cancel"}');
    expect(socket.closed).toBe(true);
    socket = new FakeSocket();
    events = [];
    hookAccepted = false;
    seek(LIKE);
    socket.open();
    await vi.advanceTimersByTimeAsync(0);
    expect(events).toEqual(['open', 'failed']);
    expect(socket.closed).toBe(true);
  });
});

describe('a seek of its own', () => {
  const HOOK: SeekRequest = {
    kind: 'hook',
    seek: { variant: 'atomic', minutes: 3, increment: 2, rated: true },
  };

  it('asks the lobby for it once the socket opens, for this socket, and cancels it', () => {
    const own = seek(HOOK);
    expect(hooks).toEqual([]);
    socket.open();
    expect(hooks).toEqual(['abc123 atomic 3+2']);
    own.cancel();
    expect(socket.sent).toEqual(['p', '{"t":"cancel"}']);
    expect(socket.closed).toBe(true);
  });

  it('fails when the lobby refuses it', async () => {
    hookAccepted = false;
    seek(HOOK);
    socket.open();
    await vi.advanceTimersByTimeAsync(0);
    expect(events).toEqual(['open', 'failed']);
  });
});
