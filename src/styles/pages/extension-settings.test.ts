import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const SECTION =
  '<div class="ln-ext-settings"><div class="ln-ext-settings__page">' +
  '<button class="ln-ext-nav-pick"></button><button class="ln-ext-switch"></button>' +
  '</div></div>';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

function visibility(selector: string): string {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element).visibility;
}

describe('the extension’s settings', () => {
  it('hide every control, not just the switches, until the stored settings are read', () => {
    const style = document.createElement('style');
    style.textContent = readFileSync(join(import.meta.dirname, 'extension-settings.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML = SECTION;
    const section = queryOne(document, '.ln-ext-settings', HTMLElement);
    if (!section) throw new Error('no section');
    section.dataset.lnExtPending = '';
    expect(visibility('.ln-ext-nav-pick')).toBe('hidden');
    expect(visibility('.ln-ext-switch')).toBe('hidden');
    delete section.dataset.lnExtPending;
    expect(visibility('.ln-ext-nav-pick')).not.toBe('hidden');
  });
});
