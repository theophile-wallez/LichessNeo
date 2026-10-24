import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's note when the browser blocks pop-ups (ui/bits/css/_notify.scss), which loads after
// ours, and our theme's grey for its empty buttons (theme/base.css).
const LICHESS_RULE = '#notify-app .browser-notification { background: #ffb86c; color: #fff; }';
const THEME_RULE = readFileSync(join(import.meta.dirname, '../theme/base.css'), 'utf8');

const NOTIFY_APP = `<div id="top"><div class="site-buttons"><div id="notify-app" class="dropdown">
  <button class="delete button-empty button"></button>
  <a class="settings button-empty button" href="/account/preferences/notification"></a>
  <div class="notifications"><a class="site_notification new"><span>Lichess</span></a></div>
  <a class="browser-notification">Notification popups disabled by browser setting</a>
</div></div></div>`;

const style = (selector: string): CSSStyleDeclaration => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
};

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe('the notifications', () => {
  it('draws Clear and Settings as the header’s bare icons, over the theme’s grey buttons', () => {
    const sheet = document.createElement('style');
    sheet.textContent =
      THEME_RULE + readFileSync(join(import.meta.dirname, 'notifications.css'), 'utf8');
    document.head.append(sheet);
    document.body.innerHTML = NOTIFY_APP;
    for (const button of ['.delete', '.settings']) {
      expect(style(button).backgroundColor).toBe('transparent');
      expect(style(button).position).toBe('absolute');
    }
  });

  it('makes the blocked pop-ups’ note a plain footer, over Lichess’s orange bar', () => {
    const sheet = document.createElement('style');
    sheet.textContent =
      readFileSync(join(import.meta.dirname, 'notifications.css'), 'utf8') + LICHESS_RULE;
    document.head.append(sheet);
    document.body.innerHTML = NOTIFY_APP;
    expect(style('.browser-notification').backgroundColor).not.toBe('#ffb86c');
    expect(style('.browser-notification').fontSize).toBe('12px');
  });
});
