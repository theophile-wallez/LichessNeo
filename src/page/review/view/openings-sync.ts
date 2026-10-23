import { html, type SafeHtml } from '#shared/html.ts';
import { connect, finishConnect } from '#page/review/practice/sync-connect.ts';
import {
  onSync,
  pushSync,
  startSync,
  stopSync,
  syncShown,
  syncState,
  track,
} from '#page/review/practice/sync.ts';
import type { Session } from '#page/review/session.ts';
import { svgIcon } from './markup.ts';

// The practice page's copy in the user's Lichess studies: its row among the
// page's choices, turned on there, read once the page shows, written once a
// line ends.

/** Follows the copy: the page draws again as it changes. */
function follow(session: Session): void {
  onSync(() => session.redraw(true));
}

/** The page shows: the studies are read, once a visit. */
export function showSync(session: Session): void {
  follow(session);
  if (syncState()) void startSync();
}

/** The page came back from Lichess's consent page: the studies are made, and the copy starts. */
export function finishConsent(session: Session): void {
  follow(session);
  void track(finishConnect);
}

export function turnSyncOn(session: Session): void {
  const user = document.body.dataset.user;
  if (!user) return;
  follow(session);
  void track(() => connect(user));
}

export function turnSyncOff(session: Session): void {
  stopSync();
  session.redraw(true);
}

/** A line ended, or practice stopped: what changed is written. */
export const writeSync = (): void => {
  if (syncState()) void pushSync();
};

/** The row's state, shown: off, busy, failed or saved, with the side's study. */
function syncControl(session: Session): SafeHtml {
  const { page } = session.language.ui.practice;
  const { on, busy, failed } = syncShown();
  if (busy)
    return html`<span class="ln-ext-openings__sync" aria-busy="true">${svgIcon('cloudBusy')}<span>${page.syncing}</span></span>`;
  if (failed)
    return html`<button class="ln-ext-openings__sync ln-ext-openings__sync--failed" data-ln-ext="practice-sync">${svgIcon('cloudFailed')}<span>${page.syncFailed}</span></button>`;
  const state = syncState();
  if (!on || !state)
    return html`<button class="ln-ext-openings__sync" data-ln-ext="practice-sync">${svgIcon('cloud')}<span>${page.syncOn}</span></button>`;
  const study = state.studies[session.view.openings.side];
  return html`<a class="ln-ext-openings__sync ln-ext-openings__sync--on" href="/study/${study}" target="_blank" data-ln-ext-tip="${page.syncOpen}">${svgIcon('cloudDone')}<span>${page.synced}</span>${svgIcon('open')}</a><button class="ln-ext-openings__unsync" data-ln-ext="practice-unsync">${page.syncStop}</button>`;
}

/** The copy's row among the page's choices. */
export const syncRow = (session: Session): SafeHtml =>
  html`<div class="ln-ext-openings__choice"><span class="ln-ext-openings__label">${session.language.ui.practice.page.syncLabel}</span><div class="ln-ext-openings__syncs">${syncControl(session)}</div></div>`;
