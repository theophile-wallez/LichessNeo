import type { Paired } from './lobby-seek.ts';

// What every seek of ours needs of the page: a lobby socket of its own, and
// the way into the game it's paired in.

/** A new lobby socket's address, on one of Lichess's socket domains; null if it names none. */
export function socketUrl(): string | null {
  const domains = document.body.dataset.socketDomains?.split(',').filter(Boolean) ?? [];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  if (!domain) return null;
  // An sri of its own, beside the page's socket.
  const sri = Math.random().toString(36).slice(2, 12);
  return `wss://${domain}/lobby/socket/v5?sri=${sri}&from=website`;
}

// As Lichess's own redirect does (lila's ui/site/src/reload.ts): an anonymous player owns the
// game through the cookie it comes with.
export function openGame({ url, cookie }: Paired): void {
  if (cookie) {
    document.cookie = `${encodeURIComponent(cookie.name)}=${cookie.value}; max-age=${cookie.maxAge}; path=/; domain=${location.hostname}`;
  }
  location.assign(`/${url.replace(/^\//, '')}`);
}
