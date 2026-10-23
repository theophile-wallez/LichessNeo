import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// The user menu's Theme panel as lila's dasher draws it with the background picture on.
const THEME_PANEL = `<div id="dasher_app"><div class="sub theme">
  <div class="selector"><button class="text">Light</button><button class="text">Dark</button></div>
  <div class="ui-roundness"><input type="range" min="0" max="15"></div>
  <label class="cmn-toggle-wrap"><input id="cmn-tg-background-picture-toggle" type="checkbox" checked></label>
  <div class="bg-opacity"><input type="range"></div>
  <div id="dasher-theme-gallery"><div class="image"><input type="text"></div></div>
</div></div>`;

const display = (selector: string): string | undefined => {
  const element = queryOne(document, selector, HTMLElement);
  return element ? getComputedStyle(element).display : undefined;
};

afterEach(() => {
  document.head.replaceChildren();
  document.body.replaceChildren();
});

describe('the user menu’s Theme panel', () => {
  it('leaves out Lichess’s background picture, and keeps the rest', () => {
    const style = document.createElement('style');
    style.textContent = readFileSync(join(import.meta.dirname, 'dasher.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML = THEME_PANEL;
    expect(display('.cmn-toggle-wrap')).toBe('none');
    expect(display('.bg-opacity')).toBe('none');
    expect(display('#dasher-theme-gallery')).toBe('none');
    expect(display('.image')).toBe('none');
    expect(display('.ui-roundness')).not.toBe('none');
    expect(display('.selector')).not.toBe('none');
  });
});
