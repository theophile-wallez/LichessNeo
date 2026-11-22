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

  it('gives the card a theory move’s room, as the review does', () => {
    const parts = demoParts();
    const demo = new Demo(parts, 1);
    demo.start();
    demo.go(6);
    expect(parts.root.dataset.theory).toBe('true');
    demo.go(17);
    expect(parts.root.dataset.theory).toBe('false');
  });

  it('keeps the verdict out of the words that scroll', () => {
    const parts = demoParts();
    const demo = new Demo(parts, 1);
    demo.start();
    demo.go(6);
    expect(queryOne(parts.say, ':scope > .demo-say__head', HTMLElement)).not.toBeNull();
    const words = ':scope > .demo-say__body > .demo-say__words';
    expect(queryOne(parts.say, words, HTMLElement)).not.toBeNull();
  });
});
