import type { Feature } from '#shared/features.ts';
import { syncWhileParsing } from '#shared/frame.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { syncChatOff } from './chat-off.ts';
import { syncTeamCount } from './count.ts';
import { watchMembership } from './membership.ts';
import { syncMembersScroll } from './members-scroll.ts';

// A team's page (styles/team-show/).

function syncTeamShow(): void {
  syncTeamCount();
  syncMembersScroll();
  syncChatOff();
}

export const teamShow: Feature = {
  name: 'team page',
  start: () => {
    watchMembership();
    syncWhileParsing(syncTeamShow);
    onEveryTick('team page', syncTeamShow);
  },
};
