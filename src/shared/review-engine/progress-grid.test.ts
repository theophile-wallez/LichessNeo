import { describe, expect, it } from 'vitest';
import { drawGrid, gridColumns, type PositionState, WIDE_ROW } from './progress-grid.ts';

describe('gridColumns', () => {
  it('fills rows of about 22 squares, as even as they can be', () => {
    expect(gridColumns(44)).toBe(22);
    expect(gridColumns(45)).toBe(16);
    expect(gridColumns(80)).toBe(20);
  });

  it("keeps a short game's rows to 16 squares at least", () => {
    expect(gridColumns(5)).toBe(16);
    expect(gridColumns(0)).toBe(16);
  });

  it("puts more squares in a long game's rows", () => {
    expect(gridColumns(132)).toBe(22);
    expect(gridColumns(160)).toBe(32);
    expect(gridColumns(40, WIDE_ROW)).toBe(20);
  });
});

const statesOf = (grid: HTMLElement): (string | undefined)[] =>
  Array.from(grid.children, square =>
    square instanceof HTMLElement ? square.dataset.lnExtState : '',
  );

describe('drawGrid', () => {
  it('draws a square per position, in its state', () => {
    const grid = document.createElement('div');
    const states: PositionState[] = ['cloud', 'engine', 'busy', 'todo'];
    drawGrid(grid, states);
    expect(statesOf(grid)).toEqual(states);
    expect(grid.style.getPropertyValue('--ln-ext-columns')).toBe('16');
  });

  it('keeps the squares already there, and drops those past the game', () => {
    const grid = document.createElement('div');
    drawGrid(grid, ['todo', 'todo', 'todo']);
    const first = grid.firstElementChild;
    drawGrid(grid, ['engine', 'busy']);
    expect(grid.firstElementChild).toBe(first);
    expect(statesOf(grid)).toEqual(['engine', 'busy']);
  });
});
