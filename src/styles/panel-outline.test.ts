import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// happy-dom computes no pseudo-element: the outline's rules are read on a child standing in
// for `main::after`.
const read = (sheet: string): string => readFileSync(join(import.meta.dirname, sheet), 'utf8');
const SHEETS = [
  'main { --ln-ext-gap: 24px; }',
  read('panel-outline.css').replaceAll('::after', ' > .outline'),
  read('game/controls.css'),
  read('game/moves-extras.css'),
];

interface Page {
  readonly main: string;
  readonly width?: number;
  readonly body?: string;
}

/** The outline's box on a page's `main`, at a window width. */
function outline({ main, width = 1280, body = '' }: Page): CSSStyleDeclaration {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = SHEETS.join('\n');
  document.head.append(style);
  document.body.className = body;
  document.body.innerHTML = `<main class="${main}"><div class="rcontrols"></div><div class="round__underboard"><div class="crosstable">1</div></div><div class="outline"></div></main>`;
  const element = queryOne(document, '.outline', HTMLElement);
  if (!element) throw new Error('no outline');
  return getComputedStyle(element);
}

const styleOf = (selector: string): CSSStyleDeclaration => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
};

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.body.className = '';
});

describe('the panel’s outline', () => {
  it('spans the game panel, from its tab bar to its bottom', () => {
    const style = outline({ main: 'round' });
    expect(style.content).toBe("''");
    expect(style.gridColumn).toBe('moves');
    expect(style.gridRow).toBe('tabs-start / moves-end');
    expect(style.pointerEvents).toBe('none');
  });

  it('stands over the game’s controls, which cover the panel’s bottom', () => {
    const style = outline({ main: 'round' });
    expect(Number(style.zIndex)).toBeGreaterThan(Number(styleOf('.rcontrols').zIndex));
  });

  // White on the light scheme's grey page, a square corner showed past the outline's round one.
  it('rounds the bottom corners of what covers the game panel’s bottom, as the outline', () => {
    const style = outline({ main: 'round' });
    for (const part of ['.rcontrols', '.crosstable']) {
      expect(styleOf(part).borderBottomLeftRadius).toBe(style.borderBottomLeftRadius);
      expect(styleOf(part).borderBottomRightRadius).toBe(style.borderBottomRightRadius);
    }
  });

  it('spans the analysis panel’s column, past its parts’ margin', () => {
    const style = outline({ main: 'analyse' });
    expect(style.gridColumn).toBe('-2 / -1');
    expect(style.gridRow).toBe('1 / -1');
    expect(style.marginLeft).toBe('24px');
  });

  it('outlines the puzzle’s panel only once it stands right of the board', () => {
    expect(outline({ main: 'puzzle', width: 1280 }).gridColumn).toBe('side');
    document.head.innerHTML = '';
    expect(outline({ main: 'puzzle', width: 1200 }).content).not.toBe("''");
  });

  it('leaves Zen mode and the narrow layouts alone', () => {
    expect(outline({ main: 'round', body: 'zenable zen' }).content).not.toBe("''");
    document.head.innerHTML = '';
    expect(outline({ main: 'analyse', width: 1000 }).content).not.toBe("''");
  });
});
