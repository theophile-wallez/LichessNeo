import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rules: a box in the page's column (ui/lib/css/component/_box.scss).
const LICHESS_RULES =
  '#main-wrap{---main-max-width:1300px}' +
  '.box{border-radius:6px;background:#262421;box-shadow:0 2px 2px 0 rgba(0,0,0,.14)}';

const INBOX = '<div id="main-wrap"><main class="box msg-app pane-convo"></main></div>';

function styled(selector: string): CSSStyleDeclaration {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
}

// happy-dom keeps a computed style through a change of attribute: each case loads afresh.
function load(flagged: boolean): void {
  const style = document.createElement('style');
  style.textContent = LICHESS_RULES + readFileSync(join(import.meta.dirname, 'frame.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML = INBOX;
  if (flagged) document.documentElement.dataset.lnExtHas = 'inbox';
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete document.documentElement.dataset.lnExtHas;
});

describe('the inbox’s page', () => {
  it('drops Lichess’s box', () => {
    load(true);
    const main = styled('main');
    expect(main.borderRadius).toBe('0px');
    expect(main.boxShadow).toBe('none');
  });

  it('takes the whole page’s width, and only on the inbox', () => {
    load(false);
    expect(styled('#main-wrap').getPropertyValue('---main-max-width')).toBe('1300px');
    load(true);
    expect(styled('#main-wrap').getPropertyValue('---main-max-width')).toBe('100%');
  });
});
