import { vi } from 'vitest';

// Test support: Lichess's routes as fetch sees them, for the code that asks
// them from the page. Each request is kept; the first route whose pattern the
// URL matches answers it, a 404 any other.

export interface Asked {
  readonly url: string;
  readonly method: string;
  /** A form's fields, as sent. */
  readonly body: URLSearchParams;
  readonly headers: Headers;
  readonly init: RequestInit | undefined;
}

export type Route = (asked: Asked) => Response | Promise<Response>;

export function fakeApi(routes: readonly (readonly [RegExp, Route])[]): Asked[] {
  const asked: Asked[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const body = init?.body instanceof URLSearchParams ? init.body : new URLSearchParams();
    const request: Asked = {
      url,
      method: init?.method ?? 'GET',
      body,
      headers: new Headers(init?.headers),
      init,
    };
    asked.push(request);
    const route = routes.find(([pattern]) => pattern.test(url));
    return route ? route[1](request) : new Response('', { status: 404 });
  });
  return asked;
}

/** An answer of text, as Lichess sends JSON, ndjson or PGN. */
export const text = (body: string, status = 200): Response => new Response(body, { status });

/** Objects one a line, as Lichess streams them. */
export const ndjson = (items: readonly unknown[]): Response =>
  text(items.map(item => JSON.stringify(item)).join('\n'));
