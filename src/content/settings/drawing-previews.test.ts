import { describe, expect, it } from 'vitest';
import { DRAWING_TOPICS } from '#shared/coach-drawings.ts';
import { setHtml } from '#shared/html.ts';
import { previewMarkup } from './drawing-previews.ts';

// Where each element of `selector` stands on the board.
const style = (selector: string) =>
  [...document.querySelectorAll(selector)].map(element => element.getAttribute('style'));

describe('previewMarkup', () => {
  it.each(DRAWING_TOPICS)('draws the %s example on a board, under its pieces', topic => {
    setHtml(document.body, previewMarkup(topic));
    const order = [...document.querySelectorAll('cg-board > *')].map(element => element.localName);
    const drawing = order.indexOf('svg');
    expect(document.querySelector('.ln-ext-drawings__marks')?.childElementCount).toBeGreaterThan(0);
    expect(order.slice(0, drawing)).toEqual(['square', 'square']);
    expect(order.slice(drawing + 1).every(name => name === 'piece')).toBe(true);
  });

  it.each(DRAWING_TOPICS)('puts a piece where the %s example’s move lands', topic => {
    setHtml(document.body, previewMarkup(topic));
    const [, landed] = style('square.last-move');
    expect(style('piece')).toContain(landed);
  });
});
