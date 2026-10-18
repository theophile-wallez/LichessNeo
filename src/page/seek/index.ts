import { z } from 'zod/mini';
import { closestTo, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { readPageInitData } from '#shared/page-init-data.ts';
import { readStored } from '#shared/storage.ts';
import { seekNextGame, type LobbySeek, type Paired, type SeekRequest } from './lobby-seek.ts';
import { nextGameOf, nextGameOfLink, type NextGame } from './next-game.ts';
import { rangeKey, waited, type PoolMember } from './pool-link.ts';

// A game's "New opponent" (or our "New 10 min", content/game/new-game.ts, or the
// review's) seeks the next game right there, as the big apps do, rather than on the home
// page as Lichess does: the button shows a loader, then how long it has waited
// and a cross, and a click stops it (styles/game/game-over.css). If our socket
// fails, the button does what Lichess's does.

// And the review's link to a new game like the one reviewed (page/review/view/new-game.ts).
const BUTTON =
  'main.round .rcontrols .follow-up :is(.new-opponent, .ln-ext-new-game), #ln-ext-review .ln-ext-new-game';
const SECOND_MS = 1000;

interface Seeking {
  readonly seek: LobbySeek;
  readonly timer: number;
  /** When the socket opened: the wait counts from there. */
  openedAt: number | null;
}

let seeking: Seeking | null = null;
// What Lichess's button seeks after this game, from the page's init data.
let roundNext: NextGame | null = null;

const signedIn = (): boolean => Boolean(document.body.dataset.user);

function socketUrl(): string | null {
  const domains = document.body.dataset.socketDomains?.split(',').filter(Boolean) ?? [];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  if (!domain) return null;
  // A socket of its own, beside the game's.
  const sri = Math.random().toString(36).slice(2, 12);
  return `wss://${domain}/lobby/socket/v5?sri=${sri}&from=website`;
}

// Snabbdom may draw the button anew: the state goes on whichever one is there.
function show(): void {
  const button = queryOne(document, BUTTON, HTMLElement);
  if (!button) return;
  const openedAt = seeking?.openedAt ?? null;
  const phase = openedAt === null ? 'connecting' : 'seeking';
  setData(button, 'lnExtSeek', seeking ? phase : null);
  const seconds = openedAt === null ? null : Math.floor((Date.now() - openedAt) / SECOND_MS);
  setData(button, 'lnExtWaited', seconds === null ? null : waited(seconds));
}

function stop(): void {
  if (!seeking) return;
  clearInterval(seeking.timer);
  seeking.seek.cancel();
  seeking = null;
  show();
}

// The lobby keeps the rating range the player last picked for the pool, under their name.
function withRange(member: PoolMember): PoolMember {
  const name = document.getElementById('user_tag')?.textContent.trim();
  const range = name ? readStored(rangeKey(name, member.id), z.string()) : null;
  return range ? { ...member, range } : member;
}

const ranged = (request: SeekRequest): SeekRequest =>
  request.kind === 'pool' ? { kind: 'pool', member: withRange(request.member) } : request;

// As Lichess's own redirect does (lila's ui/site/src/reload.ts): an anonymous player owns the
// game through the cookie it comes with.
function openGame({ url, cookie }: Paired): void {
  if (cookie) {
    document.cookie = `${encodeURIComponent(cookie.name)}=${cookie.value}; max-age=${cookie.maxAge}; path=/; domain=${location.hostname}`;
  }
  location.assign(`/${url.replace(/^\//, '')}`);
}

function start({ request, fallback }: NextGame): void {
  const url = socketUrl();
  if (!url) return location.assign(fallback);
  const seek = seekNextGame({
    url,
    request: ranged(request),
    onOpen: () => {
      if (seeking) seeking.openedAt = Date.now();
      show();
    },
    onPaired: openGame,
    onFailed: () => {
      stop();
      location.assign(fallback);
    },
  });
  seeking = { seek, timer: window.setInterval(show, SECOND_MS), openedAt: null };
  show();
}

function nextGameFor(button: HTMLElement): NextGame | null {
  if (button instanceof HTMLAnchorElement) return nextGameOfLink(button.href, signedIn());
  return roundNext;
}

function onClick(event: MouseEvent): void {
  const button = closestTo(event.target, BUTTON, HTMLElement);
  const next = button ? nextGameFor(button) : null;
  if (!next) return;
  event.preventDefault();
  event.stopPropagation();
  if (seeking) stop();
  else start(next);
}

export const nextGameSeek: Feature = {
  name: 'next game seek',
  start: () => {
    readPageInitData(text => {
      roundNext = nextGameOf(text, signedIn());
    });
    // Capturing, so the button doesn't take the page home first.
    document.addEventListener('click', onClick, true);
    // Leaving the page leaves the pool, as the lobby does.
    window.addEventListener('pagehide', stop);
  },
};
