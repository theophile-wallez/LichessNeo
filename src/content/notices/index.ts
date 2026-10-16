import type { Feature } from '#shared/features.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { message } from '#content/platform/runtime.ts';
import { createAnnounceSync } from './announce.ts';
import { createNetworkSync } from './network.ts';
import { Toaster } from './toaster.ts';

// Lichess's notices, the connection's status and the server's announcements, as toasts.
// Its own stay in the page, hidden (styles/theme/notices.css).

export const notices: Feature = {
  name: 'notices',
  start: () => {
    const toaster = new Toaster(message('noticeClose'));
    onEveryTick('network notice', createNetworkSync(toaster, message('noticeBackOnline')));
    onEveryTick('announcement', createAnnounceSync(toaster));
  },
};
