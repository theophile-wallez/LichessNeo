import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rule (ui/lib/css/component/_user-link.scss): a user link clips.
const LICHESS_RULE = '.user-link{overflow:hidden}';

const CONTACT =
  '<main class="box msg-app"><div class="msg-app__side"><div class="msg-app__side__contact">' +
  '<div class="user-link msg-app__side__contact__icon online"><icon class="line"></icon></div>' +
  '</div></div></main>';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('an inbox contact', () => {
  it('lets the online dot hang past the avatar’s round edge', () => {
    const style = document.createElement('style');
    style.textContent = LICHESS_RULE + readFileSync(join(import.meta.dirname, 'side.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML = CONTACT;
    const avatar = queryOne(document, '.msg-app__side__contact__icon', HTMLElement);
    if (!avatar) throw new Error('no avatar');
    expect(getComputedStyle(avatar).overflow).toBe('visible');
  });
});
