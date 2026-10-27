import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rules (ui/msg/css): the head's buttons, and bubbles that clip.
const LICHESS_RULES =
  '.msg-app__convo__head__actions{display:flex}.button{display:inline-block}' +
  '.msg-app__convo__msgs mine,.msg-app__convo__msgs their{overflow:hidden}';

const CONVO =
  '<main class="box msg-app"><div class="msg-app__convo"><div class="msg-app__convo__head">' +
  '<div class="msg-app__convo__head__actions">' +
  '<a class="msg-app__convo__action button button-empty play" href="/?user=x#friend"></a></div></div>' +
  '<div class="msg-app__convo__msgs"><div class="msg-app__convo__msgs__content"><group>' +
  '<their><t>Blitz?</t><em>23:14</em></their></group></div></div></div></main>';

function styled(selector: string): CSSStyleDeclaration {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

// happy-dom keeps a computed style through a change of attribute: each case loads afresh.
function load(challenge = false): void {
  const style = document.createElement('style');
  style.textContent = LICHESS_RULES + readFileSync(join(import.meta.dirname, 'convo.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML = CONVO;
  const main = queryOne(document, 'main', HTMLElement);
  if (challenge && main) main.dataset.lnExtChallenge = '';
}

describe('the inbox’s conversation', () => {
  it('hides the head’s challenge only once ours stands by the message box', () => {
    load();
    expect(styled('.play').display).toBe('grid');
    load(true);
    expect(styled('.play').display).toBe('none');
  });

  it('lets their bubble show their avatar past its edge', () => {
    load();
    expect(styled('their').overflow).toBe('visible');
  });
});
