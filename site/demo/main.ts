import { closestTo, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { wireDemo } from './clicks.ts';
import { Demo, type DemoParts } from './demo.ts';
import { graphMarkup } from './graph.ts';
import { movesMarkup } from './moves.ts';
import { PanelModes } from './modes.ts';
import { LICHESS_SET } from './pieces.ts';
import { showMockCoach, startPickers } from './pickers.ts';
import { division, moves, records, review } from './review.ts';
import { playerMarkup } from './players.ts';
import { showChesscom } from './rating.ts';
import { Summary } from './summary.ts';
import { drawTiles } from './tiles.ts';
import { startTooltips } from './tooltip.ts';
import { chesscomShown, keepChesscomShown } from '#shared/chesscom-rating/shown.ts';
import { en } from '#page/review/i18n/en.ts';
import { momentsMarkup } from '#page/review/view/moments.ts';

// The site's live review (index.html's #demo): its parts found, the graph,
// the move lists, the key moments and the summaries drawn once, and the
// clicks wired (clicks.ts); then the page's other pickers (pickers.ts).

const FIRST_COACH = 4;

function parts(root: HTMLElement): DemoParts {
  const part = (selector: string): HTMLElement => {
    const element = queryOne(root, selector, HTMLElement);
    if (!element) throw new Error(`the demo has no ${selector}`);
    return element;
  };
  return {
    root,
    panel: part('.demo-panel'),
    board: part('.demo-board'),
    coach: part('.demo-coach'),
    say: part('.demo-say'),
    nav: part('.ln-ext-review__nav'),
    graphCursor: part('.demo-graph__cursor'),
    moves: part('.demo-moves'),
    evalBar: part('.demo-evalbar'),
    capturedTop: part("[data-player='black'] .demo-captured"),
    capturedBottom: part("[data-player='white'] .demo-captured"),
  };
}

function drawOnce(root: HTMLElement, found: DemoParts): void {
  const graph = queryOne(root, '.demo-graph__plot', HTMLElement);
  if (graph) setHtml(graph, graphMarkup(records, moves, division));
  setHtml(found.moves, movesMarkup(moves, division));
  const plain = queryOne(root, '.demo-moves--plain', HTMLElement);
  if (plain) setHtml(plain, movesMarkup(moves, null));
  const moments = queryOne(root, '.demo-moments', HTMLElement);
  if (moments) setHtml(moments, momentsMarkup(review(null), en));
}

function drawPlayers(root: HTMLElement): void {
  for (const color of ['white', 'black'] as const) {
    const bar = queryOne(root, `[data-player='${color}']`, HTMLElement);
    if (bar) setHtml(bar, playerMarkup(color));
  }
}

/** The summaries: the panel's, and the tile's further down; their counts go to their moves. */
function startSummaries(root: HTMLElement, demo: Demo, modes: PanelModes): void {
  const summaries: Summary[] = [];
  const panel = queryOne(root, '.demo-summary', HTMLElement);
  const go = (ply: number): void => {
    modes.set('moves');
    demo.go(ply);
  };
  if (panel) summaries.push(new Summary(panel, { language: en, go, radar: true }));
  const tile = queryOne(document, '.tile--summary .summary', HTMLElement);
  if (tile)
    summaries.push(
      new Summary(tile, {
        language: en,
        go: ply => {
          go(ply);
          root.scrollIntoView({ behavior: 'smooth', block: 'center' });
        },
      }),
    );
  const draw = (): void => {
    for (const summary of summaries) summary.draw();
  };
  draw();
  // The extension's switch, kept as it keeps it, for the bars and the summaries alike.
  const chesscom = queryOne(document, '[data-chesscom-switch]', HTMLInputElement);
  if (!chesscom) return;
  chesscom.checked = chesscomShown();
  showChesscom(chesscom.checked);
  chesscom.addEventListener('change', () => {
    keepChesscomShown(chesscom.checked);
    showChesscom(chesscom.checked);
    draw();
  });
}

/** Marks the picked button of a picker. */
function press(button: HTMLElement): void {
  for (const other of button.parentElement?.querySelectorAll('button') ?? [])
    other.setAttribute('aria-pressed', String(other === button));
}

function wirePickers(demo: Demo, modes: PanelModes): void {
  const pickers = queryOne(document, '.demo-pickers', HTMLElement);
  pickers?.addEventListener('click', event => {
    const coach = closestTo(event.target, '[data-coach]', HTMLElement);
    if (coach) {
      press(coach);
      demo.setCoach(Number(coach.dataset.coach));
      modes.setCoach(Number(coach.dataset.coach));
      showMockCoach(Number(coach.dataset.coach));
    }
    const pieces = closestTo(event.target, '[data-pieces]', HTMLElement);
    if (pieces) {
      press(pieces);
      demo.setPieceSet(pieces.dataset.pieces ?? LICHESS_SET);
    }
  });
}

const root = queryOne(document, '#demo', HTMLElement);
if (root) {
  drawPlayers(root);
  drawTiles();
  const found = parts(root);
  drawOnce(root, found);
  startPickers(FIRST_COACH);
  const demo = new Demo(found, FIRST_COACH);
  const modes = new PanelModes(found.panel, FIRST_COACH);
  modes.set('moves');
  wirePickers(demo, modes);
  wireDemo(root, demo, modes);
  startSummaries(root, demo, modes);
  startTooltips();
  demo.start();
}
