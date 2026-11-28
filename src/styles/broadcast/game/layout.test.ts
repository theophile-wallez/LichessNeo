import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const read = (sheet: string): string =>
  readFileSync(join(import.meta.dirname, '..', '..', sheet), 'utf8');

// Lichess's own rules (ui/analyse/css/study/relay/_layout.scss): no chat on a broadcast's game
// below its third column, and no room under the jump buttons from its second.
const LICHESS_RULES =
  ':root { --ln-ext-clock-bg: rgb(1, 2, 3); }' +
  'main.is-relay .mchat { display: none; }' +
  '@media (min-width: 800px) { main.is-relay .analyse__controls .jumps { padding: 4px 4px 0; } }';

const SHEETS = [
  LICHESS_RULES,
  read('analysis/controls.css'),
  read('broadcast/games.css'),
  ...['players', 'layout', 'narrow'].map(part => read(`broadcast/game/${part}.css`)),
];

// A broadcast's game as Lichess serves it, the games and the chat sized by its handle.
const PAGE =
  '<main class="analyse is-relay"><div class="analyse__board main-board">' +
  '<div class="relay-board-player relay-board-player-bot"><div class="left"></div>' +
  '<div class="analyse__clock bottom active"></div></div></div>' +
  '<div class="analyse__tools"></div>' +
  '<div class="analyse__controls"><div class="jumps"></div></div>' +
  '<aside class="relay-tour__side"><div class="relay-tour__side__header"></div>' +
  '<div class="relay-games" style="flex: 0 0 auto; height: 50px"></div>' +
  '<div class="vertical-resize"></div>' +
  '<section class="mchat" style="flex: 0 0 auto; height: 256px">' +
  '<div class="mchat__content discussion"></div></section></aside>' +
  '<div class="analyse__underboard"></div></main>';

/** The page at a window width, the part of the panel on show. */
function render(width: number, part = 'moves'): void {
  // happy-dom answers its media queries from the window's own size.
  Reflect.set(window, 'innerWidth', width);
  const style = document.createElement('style');
  style.textContent = SHEETS.join('\n');
  document.head.append(style);
  document.body.innerHTML = PAGE;
  const main = queryOne(document, 'main', HTMLElement);
  if (main) main.dataset['lnExtPanel'] = part;
}

const styleOf = (selector: string): CSSStyleDeclaration => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
};

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('a broadcast’s game', () => {
  it('shows its games and its chat in the panel only once one of them is picked', () => {
    render(1280);
    expect(styleOf('.relay-tour__side').display).toBe('none');
    document.head.innerHTML = '';
    render(1280, 'games');
    expect(styleOf('.relay-tour__side').display).toBe('flex');
    expect(styleOf('.relay-games').display).not.toBe('none');
    expect(styleOf('.mchat').display).toBe('none');
  });

  // Lichess's handle sized them inline: the live board ran out of a 256px chat.
  it.each([
    ['games', '.relay-games'],
    ['chat', '.mchat'],
  ])('lets its %s fill the panel, whatever height Lichess gave them', (part, selector) => {
    render(1280, part);
    expect(styleOf(selector).flexGrow).toBe('1');
    expect(styleOf(selector).height).toBe('auto');
  });

  it('shows its round’s note in the panel’s area as its info', () => {
    render(1280, 'meta');
    expect(styleOf('.analyse__underboard').display).toBe('block');
    expect(styleOf('.analyse__underboard').gridArea).toContain('tools');
  });

  it('keeps as much room under its jump buttons as over them', () => {
    render(1280);
    expect(styleOf('.jumps').paddingBottom).toBe('4px');
  });

  it('lights no clock of a game that doesn’t run', () => {
    render(1280);
    expect(styleOf('.analyse__clock').backgroundColor).toBe('rgb(1, 2, 3)');
  });

  it('shows its chat below 1020px, where Lichess has none', () => {
    render(820);
    expect(styleOf('.relay-tour__side').display).toBe('flex');
    expect(styleOf('.mchat').display).toBe('flex');
    expect(styleOf('.mchat').height).toBe('360px');
  });
});
