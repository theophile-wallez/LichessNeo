import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// The editor's board, sized by its own layout rather than Lichess's.

const STYLES = join(import.meta.dirname, '..');
const SHEETS = ['board/pieces.css', 'editor/layout.css'];

// happy-dom misreads some rules the formatter spreads over several lines.
const oneLine = (css: string): string => css.replace(/\s+/g, ' ');

/** The editor's board at `width`, flat or 3D. */
function board(dimension: 'is2d' | 'is3d', width: number): CSSStyleDeclaration {
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = SHEETS.map(sheet => oneLine(readFileSync(join(STYLES, sheet), 'utf8'))).join(
    '\n',
  );
  document.head.replaceChildren(style);
  document.body.innerHTML =
    `<div id="main-wrap" class="${dimension}"><main class="board-editor">` +
    '<div class="main-board"></div></main></div>';
  const element = queryOne(document, '.main-board', HTMLElement);
  if (!element) throw new Error('no board');
  return getComputedStyle(element);
}

afterEach(() => {
  Reflect.set(window, 'innerWidth', 1024);
  document.head.replaceChildren();
  document.body.innerHTML = '';
});

describe('the editor’s board', () => {
  // Squared, a 3D board's squares were stretched and its pieces stood off them.
  it.each([1366, 390])('is a 3D board’s 476/512 of its width tall, at %ipx', width => {
    expect(board('is3d', width).height).toContain('476 / 512');
  });

  it.each([1366, 390])('stays square when flat, at %ipx', width => {
    expect(board('is2d', width).height).not.toContain('476');
  });
});
