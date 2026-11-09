import type { Feature } from '#shared/features.ts';
import { syncWhileParsing } from '#shared/frame.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { message } from '#content/platform/runtime.ts';
import { createAnnounceSync } from './announce.ts';
import { takeExpectedFlash } from './expected-flash.ts';
import { createFlashSync } from './flash.ts';
import { createNetworkSync } from './network.ts';
import { Toaster } from './toaster.ts';

// Lichess's notices, the connection's status, the server's announcements and what a form's
// page says once sent, as toasts. Its own stay in the page, hidden (styles/theme/notices.css,
// styles/pages/flash.css).

export const notices: Feature = {
  name: 'notices',
  start: () => {
    const toaster = new Toaster(message('noticeClose'));
    onEveryTick('network notice', createNetworkSync(toaster, message('noticeBackOnline')));
    onEveryTick('announcement', createAnnounceSync(toaster));
    // While the page parses too, so that a flash leaves the page before it's drawn there.
    const syncFlash = createFlashSync(toaster, takeExpectedFlash());
    syncWhileParsing(syncFlash);
    onEveryTick('flash toast', syncFlash);
  },
};
