import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import type { PoolMember } from './pool-link.ts';

// A seek in one of Lichess's pools from any page, on a connection to its
// lobby socket of our own, in its protocol (lila's ui/lib/src/socket.ts and
// ui/lobby/src/socket.ts): a ping 2.5s after each pong, the pool joined again
// every 10s while it seeks, left on cancel. Paired, the server sends the
// game's address.

const PING_MS = 2500;
const POOL_IN_MS = 10_000;
// The socket gives up on a silent server after Lichess's own wait.
const PONG_TIMEOUT_MS = 9000;

const RedirectSchema = z.object({
  t: z.literal('redirect'),
  d: z.union([z.string(), z.object({ url: z.string() })]),
});

const MessageSchema = z.object({ t: z.string() });

/** What the seek uses of a WebSocket. */
export interface PoolSocket {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(
    type: 'open' | 'message' | 'close' | 'error',
    listener: (event: Event) => void,
  ): void;
}

export interface PoolSeekOptions {
  readonly url: string;
  readonly member: PoolMember;
  readonly onOpen: () => void;
  readonly onPaired: (url: string) => void;
  /** The socket closed or went silent before a pairing. */
  readonly onFailed: () => void;
  readonly connect?: (url: string) => PoolSocket;
}

export interface PoolSeek {
  readonly cancel: () => void;
}

export function seekInPool(options: PoolSeekOptions): PoolSeek {
  const socket: PoolSocket = (options.connect ?? (url => new WebSocket(url)))(options.url);
  let done = false;
  let ping = 0;
  let silence = 0;
  let rejoin = 0;
  const send = (data: string): void => {
    if (socket.readyState === WebSocket.OPEN) socket.send(data);
  };
  const stop = (): void => {
    done = true;
    clearTimeout(ping);
    clearTimeout(silence);
    clearInterval(rejoin);
    socket.close();
  };
  const fail = (): void => {
    if (done) return;
    stop();
    options.onFailed();
  };
  const pingNow = (): void => {
    send('p');
    clearTimeout(silence);
    silence = window.setTimeout(fail, PONG_TIMEOUT_MS);
  };
  const pong = (): void => {
    clearTimeout(silence);
    clearTimeout(ping);
    ping = window.setTimeout(pingNow, PING_MS);
  };
  const join = (): void => send(JSON.stringify({ t: 'poolIn', d: options.member }));
  socket.addEventListener('open', () => {
    pingNow();
    join();
    rejoin = window.setInterval(join, POOL_IN_MS);
    options.onOpen();
  });
  socket.addEventListener('message', event => {
    const data: unknown = event instanceof MessageEvent ? event.data : null;
    if (typeof data !== 'string') return;
    if (data === '0' || parseJson(data, MessageSchema)?.t === 'n') pong();
    const redirect = parseJson(data, RedirectSchema);
    if (!redirect) return;
    stop();
    options.onPaired(typeof redirect.d === 'string' ? redirect.d : redirect.d.url);
  });
  socket.addEventListener('close', fail);
  socket.addEventListener('error', fail);
  return {
    cancel: () => {
      if (done) return;
      send(JSON.stringify({ t: 'poolOut', d: options.member.id }));
      stop();
    },
  };
}
