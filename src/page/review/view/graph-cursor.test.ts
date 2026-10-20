import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { fakeReviewLayout } from '#page/review/fixtures/fake-review-layout.ts';
import { judgedGame } from '#page/review/fixtures/unit-review.ts';
import { movesGraph } from './graph.ts';
import { CURSOR_COLOR } from './graph-markup.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'site');
  document.body.replaceChildren();
  document.head.replaceChildren();
});

/** The opera game's move-by-move graph, drawn on its tenth move. */
function drawnGraph() {
  fakeReviewLayout();
  const style = document.createElement('style');
  style.textContent = '#ln-ext-review-graph { padding: 4px 8px }';
  document.head.append(style);
  const game = judgedGame('opera');
  game.ctrl.jumpToMain(10);
  game.session.view.mode = 'moves';
  document.body.append(game.session.elements.graphBox);
  movesGraph(game.session, game.facade, true);
  return game;
}

const svgOf = (box: HTMLElement): SVGElement | null => queryOne(box, 'svg', SVGElement);
const cursorOf = (box: HTMLElement): SVGElement | null =>
  queryOne(box, `line[stroke="${CURSOR_COLOR}"]`, SVGElement);

describe('the move-by-move graph', () => {
  it('only moves its cursor as the board moves, to where a new graph would draw it', () => {
    const { session, ctrl, facade } = drawnGraph();
    const box = session.elements.graphBox;
    const svg = svgOf(box);
    const before = cursorOf(box)?.getAttribute('x1');
    ctrl.jumpToMain(20);
    movesGraph(session, facade, true);
    expect(svgOf(box)).toBe(svg);
    expect(cursorOf(box)?.getAttribute('x1')).not.toBe(before);
    const moved = cursorOf(box)?.getAttribute('x1');
    expect(cursorOf(box)?.getAttribute('x2')).toBe(moved);
    // Where a graph drawn anew puts it.
    const { review } = session.view;
    if (!review) throw new Error('no review');
    session.view.review = { ...review };
    movesGraph(session, facade, true);
    expect(svgOf(box)).not.toBe(svg);
    expect(cursorOf(box)?.getAttribute('x1')).toBe(moved);
  });
});
