import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

/** A chat's tab bar, with as many tabs as Lichess gives it (its `nb_N` class). */
function tabBar(tabs: number): CSSStyleDeclaration {
  const style = document.createElement('style');
  style.textContent = readFileSync(join(import.meta.dirname, 'tabs.css'), 'utf8');
  document.head.append(style);
  const buttons = '<button class="mchat__tab"></button>'.repeat(tabs);
  document.body.innerHTML = `<section class="mchat"><div class="mchat__tabs nb_${tabs}">${buttons}</div></section>`;
  const bar = queryOne(document, '.mchat__tabs', HTMLElement);
  if (!bar) throw new Error('no tab bar');
  return getComputedStyle(bar);
}

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('a chat’s tabs', () => {
  it('are a segmented control when there are some to pick', () => {
    expect(tabBar(2).backgroundColor).not.toBe('transparent');
  });

  // A broadcast's chat has one tab: a well around it read as a picker with one choice.
  it('are a plain title when there is but one', () => {
    expect(tabBar(1).backgroundColor).toBe('transparent');
    expect(tabBar(1).boxShadow).toBe('none');
  });
});
