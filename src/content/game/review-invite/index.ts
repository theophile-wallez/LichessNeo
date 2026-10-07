import { pickCoach } from '#shared/coach.ts';
import { queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { setHtml } from '#shared/html.ts';
import { isFrench } from '#shared/lang.ts';
import { onReviewCurve, type ReviewCurve } from '#shared/protocol.ts';
import { MascotSpot } from '#content/coach/spot.ts';
import { gameIdFrom } from '#content/game/game-id.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { curveMarkup, inviteMarkup, inviteTexts, type InviteTexts } from './markup.ts';

// After a game, the way to Game Review: a card of ours at the head of
// Lichess's follow-up buttons, where the coach offers the review, with the
// game's win chances once the page has analysed it (page/game-over). Lichess's
// analysis link stays, hidden, and gives the card its href. The stylesheet
// shows the coach's still at once; the live one, built once the page is idle,
// takes its place when first drawn (`data-cdc-live`).

const FOLLOW_UP = 'main.round .rcontrols .follow-up';

const spot = new MascotSpot({
  className: 'cdc-invite-coach',
  framing: 'bust',
  greets: false,
  whenIdle: true,
  onDrawn: holder => setData(holder, 'cdcLive', ''),
});
let coach: number | null = null;
let latest: ReviewCurve | null = null;

/** Lichess's analysis link, the last button; a tournament's or a swiss's own link has none. */
export function reviewLink(followUp: HTMLElement): HTMLAnchorElement | null {
  const last = followUp.lastElementChild;
  if (!(last instanceof HTMLAnchorElement) || last.classList.contains('text')) return null;
  const href = last.getAttribute('href') ?? '';
  return /^\/(?:tournament|swiss)\//.test(href) ? null : last;
}

function addInvite(followUp: HTMLElement, texts: InviteTexts): HTMLElement | null {
  followUp.insertAdjacentHTML('afterbegin', inviteMarkup(texts).value);
  return queryOne(followUp, ':scope > .cdc-invite', HTMLElement);
}

/** Points the way in at `href`, and draws the game's curve once it's in. */
function fillInvite(invite: HTMLElement, href: string, texts: InviteTexts): void {
  const go = queryOne(invite, '.cdc-invite__go', HTMLAnchorElement);
  if (go && go.getAttribute('href') !== href) go.setAttribute('href', href);
  const curve = latest?.gameId === gameIdFrom(href) ? latest : null;
  if (!curve || invite.dataset.cdcCurve === curve.gameId) return;
  setData(invite, 'cdcCurve', curve.gameId);
  const words = queryOne(invite, '.cdc-invite__words', HTMLElement);
  if (words && curve.turning) setHtml(words, texts.turned(curve.turning.move));
  const slot = queryOne(invite, '.cdc-invite__curve', HTMLElement);
  if (slot) setHtml(slot, curveMarkup(curve));
}

export function syncInvite(): void {
  const followUp = queryOne(document, FOLLOW_UP, HTMLElement);
  const link = followUp && reviewLink(followUp);
  if (!followUp || !link) {
    spot.sync(null, 'neutral', { coach: 1 });
    return;
  }
  const texts = inviteTexts(isFrench());
  const invite =
    queryOne(followUp, ':scope > .cdc-invite', HTMLElement) ?? addInvite(followUp, texts);
  if (!invite) return;
  fillInvite(invite, link.getAttribute('href') ?? '', texts);
  coach ??= pickCoach();
  // Neutral, as its still: a happy mascot hops.
  spot.sync(queryOne(invite, '.cdc-invite__coach', HTMLElement), 'neutral', { coach });
}

export const reviewInvite: Feature = {
  name: 'review invite',
  start: () => {
    onReviewCurve(curve => {
      latest = curve;
    });
    onEveryTick('review invite', syncInvite);
  },
};
