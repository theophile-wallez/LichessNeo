import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { takeExpectedFlash } from '#content/notices/expected-flash.ts';
import { membershipAction, watchMembership } from './membership.ts';

// A team's actions as Lichess serves them: join, leave (which asks first), and a request's cancel.
const ACTIONS =
  '<main class="team-show box"><div class="team-show__actions">' +
  '<form class="inline" action="/team/lichess-swiss/join" method="post"><button>Join team</button></form>' +
  '<form class="quit" action="/team/lichess-swiss/quit" method="post"><button>Leave team</button></form>' +
  '<form action="/team/lichess-swiss/request/cancel" method="post"><button>Cancel</button></form>' +
  '</div></main><form class="search" action="/team/search"></form>';

const form = (selector: string): HTMLFormElement => {
  const found = queryOne(document, selector, HTMLFormElement);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

beforeAll(watchMembership);

beforeEach(() => {
  vi.stubGlobal('chrome', {
    i18n: { getMessage: (name: string) => (name === 'messagesLanguage' ? 'en' : `[${name}]`) },
  });
  document.documentElement.lang = 'en';
  document.body.innerHTML = ACTIONS;
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.lang = '';
  sessionStorage.clear();
});

describe('membershipAction', () => {
  it('tells joining and leaving the team from its other forms', () => {
    expect(membershipAction(form('form[action$="/join"]'))).toBe('join');
    expect(membershipAction(form('form.quit'))).toBe('leave');
    expect(membershipAction(form('form[action$="/cancel"]'))).toBeNull();
    expect(membershipAction(form('form.search'))).toBeNull();
  });
});

describe('watchMembership', () => {
  it('has the next page say the team was joined or left', () => {
    form('form.quit').dispatchEvent(new SubmitEvent('submit', { bubbles: true }));
    expect(takeExpectedFlash()).toBe('[teamLeft]');
    form('form[action$="/join"]').dispatchEvent(new SubmitEvent('submit', { bubbles: true }));
    expect(takeExpectedFlash()).toBe('[teamJoined]');
    form('form[action$="/cancel"]').dispatchEvent(new SubmitEvent('submit', { bubbles: true }));
    expect(takeExpectedFlash()).toBeNull();
  });
});
