import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// Lichess's own rule (ui/perfStat/css): a dashed line under whatever has a tooltip.
const LICHESS_RULE =
  '.perf-stat__content [title] { border-bottom: 1px dashed #5e6ad2; cursor: help; }';

const PAGE =
  '<div class="perf-stat"><div class="box__pad perf-stat__content" data-ln-ext-perf>' +
  '<div class="ln-ext-perf ln-ext-perf--body"><span class="utitle" title="Grandmaster">GM</span></div>' +
  '<section class="glicko"><h2>Rating</h2></section>' +
  '<p><strong title="Lower value means the rating is more stable.">59.37</strong></p>' +
  '</div></div>';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

function show(): void {
  const style = document.createElement('style');
  style.textContent = LICHESS_RULE + readFileSync(join(import.meta.dirname, 'cards.css'), 'utf8');
  document.head.append(style);
  document.body.innerHTML = PAGE;
}

const styleOf = (selector: string): CSSStyleDeclaration => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
};

describe("the rating stats' cards", () => {
  it('take Lichess’s dashed tooltip line off their badges, and only theirs', () => {
    show();
    expect(styleOf('.utitle').borderBottomStyle).toBe('none');
    expect(styleOf('.utitle').cursor).not.toBe('help');
    expect(styleOf('p > strong').borderBottomStyle).toBe('dashed');
  });

  it('hide the sections they stand in for', () => {
    show();
    expect(styleOf('section.glicko').display).toBe('none');
    expect(styleOf('.ln-ext-perf').display).toBe('grid');
  });
});
