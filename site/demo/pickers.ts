import { closestTo, queryAll, queryOne } from '#shared/dom.ts';
import { type SafeHtml, setHtml } from '#shared/html.ts';
import { isLayout, layoutButtons, mockMarkup } from './layout.ts';
import { BOARDS, boardButtons, showBoard, showTheme, THEMES, themeButtons } from './looks.ts';
import { startConverter } from './chesscom.ts';
import { hopPieces, revealFrom } from './motion/reveal.ts';

// The page's pickers beyond the review's own: the color theme, the board and
// the layout, each a group of buttons; a board's groups (by the review and by
// the layout) stay in step. And the Chess.com tile's converter.

/** Marks the button of `value` picked in every group of `attribute`. */
function press(attribute: string, value: string): void {
  for (const button of queryAll(document, `[data-${attribute}]`, HTMLElement))
    button.setAttribute('aria-pressed', String(button.getAttribute(`data-${attribute}`) === value));
}

function fill(selector: string, markup: SafeHtml): void {
  for (const group of queryAll(document, selector, HTMLElement)) setHtml(group, markup);
}

const PICKS = '[data-theme], [data-board], [data-layout]';

// While a look spreads, its transition takes the pointer, aimed at the root: a pick would
// neither show its hover nor take its click until the circle ends. The button under the
// pointer is found by its box instead, and marked as hovered.
let spreading = 0;
let hovered: HTMLElement | null = null;

function pickAt(x: number, y: number): HTMLElement | null {
  return (
    queryAll(document, PICKS, HTMLElement).find(button => {
      const box = button.getBoundingClientRect();
      return x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    }) ?? null
  );
}

function hover(button: HTMLElement | null): void {
  if (button === hovered) return;
  if (hovered) delete hovered.dataset.hover;
  if (button) button.dataset.hover = '';
  hovered = button;
  document.documentElement.style.cursor = button ? 'pointer' : '';
}

function followPointer(event: MouseEvent): void {
  if (spreading > 0) hover(pickAt(event.clientX, event.clientY));
}

/** Marks the pick under the pointer as hovered until `done`, the spread's end. */
function hoverWhile(done: Promise<void>): void {
  spreading += 1;
  void done.finally(() => {
    spreading -= 1;
    if (spreading === 0) hover(null);
  });
}

/** What a click picked: the button under the pointer while a look spreads. */
function clicked(event: MouseEvent): EventTarget | null {
  if (event.target !== document.documentElement) return event.target;
  return pickAt(event.clientX, event.clientY);
}

function pick(target: EventTarget | null): void {
  const themeButton = closestTo(target, '[data-theme]', HTMLElement);
  const theme = THEMES.find(entry => entry.id === themeButton?.dataset.theme);
  if (theme && themeButton)
    hoverWhile(
      revealFrom(themeButton, () => {
        press('theme', theme.id);
        showTheme(theme);
      }),
    );
  const boardButton = closestTo(target, '[data-board]', HTMLElement);
  const board = BOARDS.find(entry => entry.id === boardButton?.dataset.board);
  if (board && boardButton)
    hoverWhile(
      revealFrom(boardButton, () => {
        press('board', board.id);
        showBoard(board);
      }),
    );
  const mock = queryOne(document, '.mock', HTMLElement);
  if (board && mock) hopPieces(mock);
  const layout = closestTo(target, '[data-layout]', HTMLElement)?.dataset.layout;
  if (isLayout(layout) && mock) {
    press('layout', layout);
    mock.dataset.shape = layout;
  }
}

/** The layout's coach follows the review's. */
export function showMockCoach(coach: number): void {
  const picture = queryOne(document, '.mock-coach', HTMLImageElement);
  if (picture) picture.src = `img/coaches/mascot-${coach}.webp`;
}

export function startPickers(coach: number): void {
  fill('[data-picks=theme]', themeButtons('neo'));
  fill('[data-picks=board]', boardButtons('accent'));
  fill('[data-picks=layout]', layoutButtons('rail'));
  const mock = queryOne(document, '.mock', HTMLElement);
  if (mock) setHtml(mock, mockMarkup(coach));
  document.addEventListener('click', event => {
    pick(clicked(event));
    followPointer(event);
  });
  document.addEventListener('pointermove', followPointer);
  startConverter();
}
