import { DevCheckResponseSchema, type DevCheckRequest } from '#shared/dev-check.ts';
import { DEV_BUILD } from '#shared/build-mode.ts';
import type { Feature } from '#shared/features.ts';
import { isConnected } from '#content/platform/runtime.ts';
import { messageType } from '#shared/prefix.ts';

// Dev builds only (#shared/build-mode.ts): when the tab gets focus, ask the
// background worker whether the files on disk changed (a new build). If so it
// reloads the extension, and the tab reloads once the new version is in.

const ORPHAN_POLL_MS = 100;
// Leaves the new version time to load before the tab reloads.
const RELOAD_DELAY_MS = 250;

// The address the page was opened at. Lichess drops a link's hash once read
// (`/game/<id>#46`, the move it opens on), and a reload without it opens the
// game at its start.
let opened = { path: '', hash: '' };

function reloadPage(): void {
  if (opened.hash !== '' && location.hash === '' && location.pathname === opened.path)
    history.replaceState(history.state, '', `${location.pathname}${location.search}${opened.hash}`);
  location.reload();
}

function reloadWhenOrphaned(): void {
  const poll = setInterval(() => {
    if (isConnected()) return;
    clearInterval(poll);
    setTimeout(reloadPage, RELOAD_DELAY_MS);
  }, ORPHAN_POLL_MS);
}

async function isStale(): Promise<boolean> {
  const request: DevCheckRequest = { type: messageType('dev-check') };
  try {
    const response = await chrome.runtime.sendMessage<DevCheckRequest, unknown>(request);
    return DevCheckResponseSchema.safeParse(response).data?.reload === true;
  } catch {
    // No worker to answer: nothing to reload.
    return false;
  }
}

async function checkForUpdate(): Promise<void> {
  if (document.visibilityState !== 'visible') return;
  // Another tab's check has reloaded the extension, orphaning this script.
  if (!isConnected()) {
    reloadPage();
    return;
  }
  if (await isStale()) reloadWhenOrphaned();
}

// Coming back to a tab fires both focus and visibilitychange: one check is
// enough, and each makes the worker hash every bundle.
let checking = false;

function onFocus(): void {
  if (checking) return;
  checking = true;
  void checkForUpdate().finally(() => {
    checking = false;
  });
}

export const devReload: Feature = {
  name: 'dev reload',
  start: () => {
    if (!DEV_BUILD) return;
    opened = { path: location.pathname, hash: location.hash };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    onFocus();
  },
};
