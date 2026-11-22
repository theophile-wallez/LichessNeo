import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { Demo, type DemoParts } from './demo.ts';
import { movesMarkup } from './moves.ts';
import { division, moves } from './review.ts';

afterEach(() => document.body.replaceChildren());

function demoParts(): DemoParts {
  const part = (): HTMLElement => root.appendChild(document.createElement('div'));
  const root = document.body.appendChild(document.createElement('div'));
  const panel = part();
  const list = panel.appendChild(document.createElement('div'));
  list.className = 'demo-moves';
  setHtml(list, movesMarkup(moves, division));
  return {
    root,
    panel,
    board: part(),
    coach: part(),
    say: part(),
    nav: part(),
    graphCursor: part(),
    moves: list,
    evalBar: part(),
    capturedTop: part(),
    capturedBottom: part(),
  };
}

describe('the live review', () => {
  it('opens on 8…c6, playing, a few moves before Morphy’s sacrifices', () => {
    const parts = demoParts();
    const demo = new Demo(parts, 1);
    demo.start();
    expect(queryOne(parts.moves, '[aria-current]', HTMLElement)?.dataset.ply).toBe('16');
    expect(demo.playing).toBe(true);
  });
});
