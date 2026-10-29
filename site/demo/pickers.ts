import { closestTo, queryAll, queryOne } from '#shared/dom.ts';
import { type SafeHtml, setHtml } from '#shared/html.ts';
import { isLayout, layoutButtons, mockMarkup } from './layout.ts';
import { BOARDS, boardButtons, showBoard, showTheme, THEMES, themeButtons } from './looks.ts';
import { startConverter } from './chesscom.ts';

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

function pick(target: EventTarget | null): void {
  const theme = THEMES.find(
    entry => entry.id === closestTo(target, '[data-theme]', HTMLElement)?.dataset.theme,
  );
  if (theme) {
    press('theme', theme.id);
    showTheme(theme);
  }
  const board = BOARDS.find(
    entry => entry.id === closestTo(target, '[data-board]', HTMLElement)?.dataset.board,
  );
  if (board) {
    press('board', board.id);
    showBoard(board);
  }
  const layout = closestTo(target, '[data-layout]', HTMLElement)?.dataset.layout;
  const mock = queryOne(document, '.mock', HTMLElement);
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
  fill('[data-picks=layout]', layoutButtons('sidebar'));
  const mock = queryOne(document, '.mock', HTMLElement);
  if (mock) setHtml(mock, mockMarkup(coach));
  document.addEventListener('click', event => pick(event.target));
  startConverter();
}
