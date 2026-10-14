import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Color, Square } from '#shared/chess/types.ts';
import { createCustomElement } from '#shared/dom.ts';
import { rectAt } from '#shared/testing/layout.ts';
import { createLayer, type Layer } from './layer.ts';
import { createScene } from './scene.ts';

let hovered: (Square | null)[];
let layer: Layer;
let orientation: Color;

function attach(): HTMLElement {
  const container = createCustomElement('cg-container');
  container.append(createCustomElement('cg-board'));
  container.getBoundingClientRect = () => rectAt({ top: 0, left: 0, width: 800, height: 800 });
  document.body.append(container);
  layer.attach({ container, orientation: () => orientation });
  return container;
}

const point = (container: HTMLElement, type: string, x: number, y: number): void => {
  const event = new MouseEvent(type, { clientX: x, clientY: y });
  container.dispatchEvent(Object.assign(event, { pointerType: 'mouse' }));
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] });
  hovered = [];
  orientation = 'white';
  const scene = createScene();
  const hover: typeof scene.hover = (square, color, now) => {
    hovered.push(square);
    scene.hover(square, color, now);
  };
  layer = createLayer({ scene: { ...scene, hover }, hoverColor: () => '#0f0' });
});

afterEach(() => {
  layer.remove();
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('the backlit layer', () => {
  it('lies under the pieces, in chessground’s container, until removed', () => {
    const container = attach();
    expect(container.firstElementChild?.matches('canvas.lr-ext-backlit')).toBe(true);
    layer.remove();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('reads each side’s light off the stylesheet', () => {
    const container = attach();
    const canvas = container.querySelector('canvas');
    canvas?.style.setProperty('--lr-ext-backlit-white', '#abcdef');
    canvas?.style.setProperty('--lr-ext-backlit-black', '#123456');
    expect(layer.side('white')).toBe('#abcdef');
    expect(layer.side('black')).toBe('#123456');
  });

  it('follows the mouse from square to square, either way up, and off the board', () => {
    const container = attach();
    point(container, 'pointermove', 50, 750);
    vi.advanceTimersToNextFrame();
    orientation = 'black';
    point(container, 'pointermove', 50, 750);
    vi.advanceTimersToNextFrame();
    point(container, 'pointerleave', 0, 0);
    vi.advanceTimersToNextFrame();
    expect(hovered).toEqual(['a1', 'h8', null]);
  });

  it('leaves a touch alone, which has no hover', () => {
    const container = attach();
    const touch = new MouseEvent('pointermove', { clientX: 50, clientY: 50 });
    container.dispatchEvent(Object.assign(touch, { pointerType: 'touch' }));
    vi.advanceTimersToNextFrame();
    expect(hovered).toEqual([]);
  });
});
