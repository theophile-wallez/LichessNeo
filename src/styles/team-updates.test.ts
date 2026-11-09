import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rules for the page (ui/team/css/_update.scss), compiled.
const LICHESS_RULES =
  '.team-update__side{flex:0 0 50ch;background:#262421}' +
  '.team-update__side__team--unread{background:#3a3a2a}' +
  '.team-update__convo__update{border:1px solid #404040}' +
  '.team-update__convo__update.team-update__convo__update--unread{border-color:#d59020}' +
  '.team-update__convo__update__body{padding:1.5em 2em;background:#262421}';

const PAGE =
  '<main class="box team-update team-update--team"><div class="team-update__side">' +
  '<div class="team-update__side__content"><a class="team-update__side__team ' +
  'team-update__side__team--unread"></a></div></div><div class="team-update__convo">' +
  '<div class="team-update__convo__update team-update__convo__update--unread">' +
  '<div class="team-update__convo__update__info"><a href="/team/coders">Coders</a>' +
  '<div class="team-update__convo__update__meta"><time>3 hours ago</time>' +
  '<span>by <a class="user-link" href="/@/tjychess">tjychess</a></span></div></div>' +
  '<div class="team-update__convo__update__body"><p>Hello</p></div></div></div></main>';

function styled(selector: string): CSSStyleDeclaration {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
}

function load(): void {
  const style = document.createElement('style');
  style.textContent =
    LICHESS_RULES + readFileSync(join(import.meta.dirname, 'team-updates.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML = PAGE;
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('a team’s updates', () => {
  it('lists the teams as the inbox lists its contacts', () => {
    load();
    expect(styled('.team-update__side').flexBasis).toBe('360px');
    expect(styled('.team-update__side').backgroundColor).not.toBe('#262421');
    expect(styled('.team-update__side__team').backgroundColor).not.toBe('#3a3a2a');
  });

  it('draws an update as a bubble, an unread one without Lichess’s border', () => {
    load();
    expect(styled('.team-update__convo__update').borderStyle).toBe('none');
    expect(styled('.team-update__convo__update__body').paddingTop).toBe('0px');
  });

  it('names the sender without Lichess’s "by"', () => {
    load();
    expect(styled('.team-update__convo__update__meta > span').fontSize).toBe('0px');
    expect(styled('.team-update__convo__update__meta .user-link').fontSize).toBe('14px');
  });

  it('leaves out the team on one team’s updates, which all come from it', () => {
    load();
    expect(styled('.team-update__convo__update__info > a').display).toBe('none');
  });
});
