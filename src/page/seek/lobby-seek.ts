import { z } from 'zod/mini';
import { parseJson } from '#shared/json.ts';
import type { PoolMember } from './pool-link.ts';

// The next game sought from any page, on a connection to Lichess's lobby
// socket of our own, in its protocol (lila's ui/lib/src/socket.ts and
// ui/lobby/src/socket.ts): a ping 2.5s after each pong. In a pool, the pool
// is joined again every 10s and left on cancel. Otherwise the lobby gets a
// seek like a game (as its `/?hook_like=<id>` does), bound to the socket's
// sri, and cancelled with it. Paired, the server sends the game's address,
// and for an anonymous player the cookie that makes them its owner.

const PING_MS = 2500;
const POOL_IN_MS = 10_000;
// The socket gives up on a silent server after Lichess's own wait.
const PONG_TIMEOUT_MS = 9000;

const CookieSchema = z.object({ name: z.string(), value: z.string(), maxAge: z.number() });

const RedirectSchema = z.object({
  t: z.literal('redirect'),
  d: z.union([z.string(), z.object({ url: z.string(), cookie: z.optional(CookieSchema) })]),
});

const MessageSchema = z.object({ t: z.string() });

export type PairingCookie = z.infer<typeof CookieSchema>;

export interface Paired {
  readonly url: string;
  readonly cookie: PairingCookie | null;
}

/** A pool to join, or a game whose like to seek in the lobby. */
export type SeekRequest =
  | { readonly kind: 'pool'; readonly member: PoolMember }
  | { readonly kind: 'like'; readonly gameId: string };

/** What the seek uses of a WebSocket. */
export interface LobbySocket {
  readonly readyState: number;
  send(data: string): void;
  close(): void;
  addEventListener(
    type: 'open' | 'message' | 'close' | 'error',
    listener: (event: Event) => void,
  ): void;
}

export interface LobbySeekOptions {
  readonly url: string;
  readonly request: SeekRequest;
  readonly onOpen: () => void;
  readonly onPaired: (paired: Paired) => void;
  /** The socket closed or went silent, or the lobby refused the seek, before a pairing. */
  readonly onFailed: () => void;
  readonly connect?: (url: string) => LobbySocket;
  /** Asks the lobby for a seek like the game, for the socket `sri`; true once it's in. */
  readonly hookLike?: (sri: string, gameId: string) => Promise<boolean>;
}

export interface LobbySeek {
  readonly cancel: () => void;
}

// lila's controllers.Setup.like, as the lobby posts it.
async function postHookLike(sri: string, gameId: string): Promise<boolean> {
  try {
    const path = `/setup/hook/${encodeURIComponent(sri)}/like/${encodeURIComponent(gameId)}`;
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    });
    return response.ok;
  } catch {
    return false;
  }
}

function pairedOf(data: string): Paired | null {
  const redirect = parseJson(data, RedirectSchema);
  if (!redirect) return null;
  const { d } = redirect;
  return typeof d === 'string'
    ? { url: d, cookie: null }
    : { url: d.url, cookie: d.cookie ?? null };
}

type Send = (data: string) => void;

interface Heartbeat {
  readonly start: () => void;
  readonly pong: () => void;
  readonly stop: () => void;
}

// A ping 2.5s after each pong; a server silent past Lichess's wait has failed.
function heartbeat(send: Send, fail: () => void): Heartbeat {
  let ping = 0;
  let silence = 0;
  const pingNow = (): void => {
    send('p');
    clearTimeout(silence);
    silence = window.setTimeout(fail, PONG_TIMEOUT_MS);
  };
  return {
    start: pingNow,
    pong: () => {
      clearTimeout(silence);
      clearTimeout(ping);
      ping = window.setTimeout(pingNow, PING_MS);
    },
    stop: () => {
      clearTimeout(ping);
      clearTimeout(silence);
    },
  };
}

interface Joined {
  readonly leave: () => void;
  readonly stop: () => void;
}

// In the pool again every 10s until it's left; a lobby seek once, cancelled on leaving.
function join(options: LobbySeekOptions, send: Send, fail: () => void): Joined {
  const { request } = options;
  if (request.kind === 'pool') {
    const poolIn = (): void => send(JSON.stringify({ t: 'poolIn', d: request.member }));
    poolIn();
    const rejoin = window.setInterval(poolIn, POOL_IN_MS);
    return {
      leave: () => send(JSON.stringify({ t: 'poolOut', d: request.member.id })),
      stop: () => clearInterval(rejoin),
    };
  }
  const sri = new URL(options.url).searchParams.get('sri') ?? '';
  void (options.hookLike ?? postHookLike)(sri, request.gameId).then(ok => {
    if (!ok) fail();
    return ok;
  });
  return { leave: () => send(JSON.stringify({ t: 'cancel' })), stop: () => {} };
}

export function seekNextGame(options: LobbySeekOptions): LobbySeek {
  const socket: LobbySocket = (options.connect ?? (url => new WebSocket(url)))(options.url);
  let done = false;
  let joined: Joined | null = null;
  const send = (data: string): void => {
    if (socket.readyState === WebSocket.OPEN) socket.send(data);
  };
  const stop = (): void => {
    done = true;
    beat.stop();
    joined?.stop();
    socket.close();
  };
  const fail = (): void => {
    if (done) return;
    stop();
    options.onFailed();
  };
  const beat = heartbeat(send, fail);
  socket.addEventListener('open', () => {
    beat.start();
    joined = join(options, send, fail);
    options.onOpen();
  });
  socket.addEventListener('message', event => {
    const data: unknown = event instanceof MessageEvent ? event.data : null;
    if (typeof data !== 'string') return;
    if (data === '0' || parseJson(data, MessageSchema)?.t === 'n') beat.pong();
    const paired = pairedOf(data);
    if (!paired) return;
    stop();
    options.onPaired(paired);
  });
  socket.addEventListener('close', fail);
  socket.addEventListener('error', fail);
  return {
    cancel: () => {
      if (done) return;
      joined?.leave();
      stop();
    },
  };
}
