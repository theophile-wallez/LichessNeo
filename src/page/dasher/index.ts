import { onDomReady } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { pollUntil } from '#shared/poll.ts';
import { esmBundleUrl, loadCssKey } from '#page/lichess/assets.ts';
import { readKeptDasher, readPageDasherState, storeDasherText } from './cache.ts';

// Lichess loads the user menu (`#dasher_app`) lazily on hover or click: first
// `dasher.css` and `dasher.js` (not even wired until `topBar` runs in an 800 ms
// idle callback), then `GET /dasher` (`no-cache`, uncached by Cloudflare),
// leaving its logo spinner up whenever the link is slow or busy with the
// engine or game exports.
//
// Here:
// 1. `fetch('/dasher')` answers at once from `localStorage` when this user's
//    lists are cached, reconciled with the page's current theme, board and
//    piece set, and refreshes the cache in the background once it's 10 min old;
// 2. once the page is idle, `dasher.css` and `dasher.js` are preloaded without
//    calling `initModule()` (which would start the socket's ping feed), and a
//    missing cache is primed once.

const IDLE_TIMEOUT_MS = 2500;
const ASSET_POLL_MS = 200;
const ASSET_GIVE_UP_MS = 15_000;

const DASHER_HEADERS = {
  Accept: 'application/web.lichess+json',
  'X-Requested-With': 'XMLHttpRequest',
} as const;

export function isDasherGet(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
  if (method.toUpperCase() !== 'GET') return false;
  const raw = input instanceof Request ? input.url : String(input);
  try {
    const url = new URL(raw, location.origin);
    return url.origin === location.origin && url.pathname === '/dasher';
  } catch {
    return false;
  }
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function fetchAndStore(
  nativeFetch: typeof window.fetch,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await nativeFetch(input, init);
  if (response.ok) {
    void response
      .clone()
      .text()
      .then(storeDasherText)
      .catch(() => undefined);
  }
  return response;
}

/** Wraps `window.fetch` so `GET /dasher` resolves immediately from storage when available. */
export function interceptDasherFetch(): (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response> {
  const nativeFetch = window.fetch.bind(window);
  let refreshing: Promise<unknown> | null = null;

  const refresh = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const pending = fetchAndStore(nativeFetch, input, init);
    refreshing = pending.finally(() => {
      refreshing = null;
    });
    return pending;
  };

  window.fetch = (input, init) => {
    if (!isDasherGet(input, init)) return nativeFetch(input, init);
    const kept = readKeptDasher(readPageDasherState());
    if (!kept) return refresh(input, init);
    if (kept.stale && !refreshing) {
      void refresh('/dasher', { credentials: 'same-origin', headers: DASHER_HEADERS }).catch(
        () => undefined,
      );
    }
    return Promise.resolve(jsonResponse(kept.data));
  };
  return nativeFetch;
}

function warmDasher(
  nativeFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): void {
  if (!document.getElementById('dasher_app')) return;
  pollUntil(
    () => esmBundleUrl('dasher'),
    bundleUrl => {
      loadCssKey('dasher');
      void import(bundleUrl).catch(() => undefined);
      if (!readKeptDasher(readPageDasherState())) {
        void fetchAndStore(nativeFetch, '/dasher', {
          credentials: 'same-origin',
          headers: DASHER_HEADERS,
        }).catch(() => undefined);
      }
    },
    { intervalMs: ASSET_POLL_MS, giveUpMs: ASSET_GIVE_UP_MS },
  );
}

function scheduleWarmup(
  nativeFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): void {
  onDomReady(() => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(() => warmDasher(nativeFetch), { timeout: IDLE_TIMEOUT_MS });
    } else {
      setTimeout(() => warmDasher(nativeFetch), IDLE_TIMEOUT_MS);
    }
  });
}

export const dasher: Feature = {
  name: 'dasher',
  start: () => {
    const nativeFetch = interceptDasherFetch();
    scheduleWarmup(nativeFetch);
  },
};
