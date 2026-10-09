import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { seekInPool, type PoolSeekOptions } from './pool-socket.ts';

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

function seek(): ReturnType<typeof seekInPool> {
  const options: PoolSeekOptions = {
    url: 'wss://socket.test/lobby/socket/v5',
    member: { id: '2+1', blocking: 'bob' },
    onOpen: () => events.push('open'),
    onPaired: url => events.push(`paired ${url}`),
    onFailed: () => events.push('failed'),
    connect: () => socket,
  };
  return seekInPool(options);
}

beforeEach(() => {
  vi.useFakeTimers();
  socket = new FakeSocket();
  events = [];
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
