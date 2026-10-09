import { z } from 'zod/mini';
import { closestTo, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { readStored } from '#shared/storage.ts';
import { poolOfLink, rangeKey, waited, type PoolMember } from './pool-link.ts';
import { seekInPool, type PoolSeek } from './pool-socket.ts';

// A game's "New opponent" seeks the next game right there, as the big apps
// do, rather than on the home page as Lichess does: the button shows a
// loader, then how long it has waited and a cross, and a click stops it
// (styles/game/game-over.css). Signed in only: Lichess pairs an anonymous
// player through the lobby's seeks instead. If our socket fails, the button
// does what Lichess's does.

const BUTTON = 'main.round .rcontrols .follow-up a.new-opponent';
const SECOND_MS = 1000;

interface Seeking {
  readonly seek: PoolSeek;
  readonly timer: number;
  /** When the socket opened: the wait counts from there. */
  openedAt: number | null;
}

let seeking: Seeking | null = null;

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
  setData(button, 'lrExtSeek', seeking ? phase : null);
  const seconds = openedAt === null ? null : Math.floor((Date.now() - openedAt) / SECOND_MS);
  setData(button, 'lrExtWaited', seconds === null ? null : waited(seconds));
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

function start(member: PoolMember, fallback: string): void {
  const url = socketUrl();
  if (!url) return location.assign(fallback);
  const seek = seekInPool({
    url,
    member: withRange(member),
    onOpen: () => {
      if (seeking) seeking.openedAt = Date.now();
      show();
    },
    onPaired: game => location.assign(game),
    onFailed: () => {
      stop();
      location.assign(fallback);
    },
  });
  seeking = { seek, timer: window.setInterval(show, SECOND_MS), openedAt: null };
  show();
}

function onClick(event: MouseEvent): void {
  const button = closestTo(event.target, BUTTON, HTMLAnchorElement);
  const member = button && document.body.dataset.user ? poolOfLink(button.href) : null;
  if (!button || !member) return;
  event.preventDefault();
  event.stopPropagation();
  if (seeking) stop();
  else start(member, button.href);
}

export const poolSeek: Feature = {
  name: 'pool seek',
  start: () => {
    // Capturing, so the link doesn't take the page home first.
    document.addEventListener('click', onClick, true);
    // Leaving the page leaves the pool, as the lobby does.
    window.addEventListener('pagehide', stop);
  },
};
