import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { syncChatOff } from './chat-off.ts';
import { syncTeamCount } from './count.ts';
import { syncMembersScroll } from './members-scroll.ts';

// A team's page as Lichess serves it: the count in its title, the recent members' list that
// loads more as it scrolls, and the chat with its toggle.
const TEAM =
  '<main class="team-show box"><div class="box__top"><h1>Lichess Swiss</h1>' +
  '<div><a href="/team/lichess-swiss/members"><strong>1,234</strong> members</a></div></div>' +
  '<div class="team-show__content"><div class="team-show__members"><div class="recent-members">' +
  '<h2><a href="/team/lichess-swiss/members">Members</a></h2>' +
  '<div class="userlist infinite-scroll" data-scroll-selector="window"></div></div></div>' +
  '<section class="mchat"><div class="mchat__tabs"><div class="mchat__tab discussion">' +
  '<span>Chat room</span><input type="checkbox" checked></div></div>' +
  '<div class="mchat__content"></div></section></div></main>';

const element = (selector: string): HTMLElement => {
  const found = queryOne(document, selector, HTMLElement);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

beforeAll(() => {
  document.body.innerHTML = TEAM;
});

afterEach(() => {
  document.body.innerHTML = TEAM;
});

describe('a team’s member count', () => {
  it('heads the recent members, and follows Lichess’s', () => {
    syncTeamCount();
    expect(element('.recent-members h2 .ln-ext-team-count').innerHTML).toBe(
      '<strong>1,234</strong> members',
    );
    element('.box__top a strong').textContent = '1,235';
    syncTeamCount();
    expect(element('.ln-ext-team-count').textContent).toBe('1,235 members');
    expect(document.querySelectorAll('.ln-ext-team-count')).toHaveLength(1);
  });
});

describe('a team’s recent members', () => {
  it('load more as their own box scrolls, not the window', () => {
    syncMembersScroll();
    expect(element('.userlist').dataset.scrollSelector).toBe('main.team-show .team-show__members');
  });
});

describe('a team’s chat', () => {
  it('says when its toggle turns it off, and back on', () => {
    syncChatOff();
    expect(element('.mchat').dataset.lnExtOff).toBeUndefined();
    const toggle = queryOne(document, '.mchat__tab input', HTMLInputElement);
    if (toggle) toggle.checked = false;
    syncChatOff();
    expect(element('.mchat').dataset.lnExtOff).toBe('');
    if (toggle) toggle.checked = true;
    syncChatOff();
    expect(element('.mchat').dataset.lnExtOff).toBeUndefined();
  });
});
