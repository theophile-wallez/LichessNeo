import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { markTree } from './variations.ts';

const move = (san: string, index = '', classes = ''): string =>
  `<move class="${classes}">${index && `<index>${index}</index>`}<san>${san}</san></move>`;

/** A line's moves from `ply` on, numbered as Lichess does: white's, and black's where the line starts. */
function run(ply: number, count: number, active = -1): string {
  return Array.from({ length: count }, (_, i) => {
    const turn = Math.ceil((ply + i) / 2);
    let index = '';
    if ((ply + i) % 2 === 1) index = `${turn}.`;
    else if (i === 0) index = `${turn}...`;
    return move(`m${ply + i}`, index, i === active ? 'active' : '');
  }).join('');
}

/** The move list, with one card under 1. e4 holding the variations given. */
function tree(...lines: string[]): HTMLElement {
  document.body.innerHTML =
    '<main class="analyse"><div class="tview2 tview2-column">' +
    `<index>1</index>${move('e4')}<move class="empty">...</move>` +
    `<interrupt><lines>${lines.map(line => `<line>${line}</line>`).join('')}</lines></interrupt>` +
    '</div></main>';
  const list = queryOne(document, '.tview2', HTMLElement);
  if (!list) throw new Error('no move list');
  return list;
}

const moves = (): HTMLElement[] => queryAll(document, 'interrupt move', HTMLElement);
const folds = (): string[] => moves().map(each => each.dataset.lrExtFold ?? '-');
const numbers = (): string[] => moves().map(each => each.dataset.lrExtIndex ?? '-');

beforeEach(() => {
  vi.stubGlobal('chrome', {
    i18n: { getMessage: (_name: string, [count]: string[]) => `${count} moves` },
  });
});

describe('the variations’ folds', () => {
  it('folds a long run behind a pill that counts its moves, keeping its ends', () => {
    markTree(tree(run(2, 9)));
    expect(folds()).toEqual(['-', '-', 'pill', ...Array<string>(5).fill('hidden'), '-']);
    expect(moves()[2]?.dataset.lrExtFoldLabel).toBe('6 moves');
    expect(moves()[8]?.dataset.lrExtIndex).toBe('5...');
  });

  it('leaves a run alone that would hide fewer than four moves', () => {
    markTree(tree(run(2, 6)));
    expect(folds().every(state => state === '-')).toBe(true);
  });

  it('opens a run while the board is in it, and folds it again once it leaves', () => {
    const list = tree(run(2, 9, 4));
    markTree(list);
    expect(folds().every(state => state === '-')).toBe(true);
    moves()[4]?.classList.remove('active');
    markTree(list);
    expect(folds()[2]).toBe('pill');
  });
});

describe('the variations’ numbers', () => {
  it('drops the dots off a black move that starts a line, its branch tile says it', () => {
    markTree(tree(run(2, 3), run(3, 2)));
    expect(numbers()).toEqual(['1', '-', '-', '-', '-']);
  });

  it('gives a black move its number back after an alternative', () => {
    markTree(tree(`${run(2, 2)}<inline>${move('Nc3', '2.')}</inline>${move('d6')}`));
    expect(numbers()).toEqual(['1', '-', '-', '2...']);
  });
});

describe('the variations’ branches', () => {
  it('marks the branch the board is on, and the one holding a costly move', () => {
    const blunder = `<lines><line>${move('Nc3', '2.', 'blunder')}</line></lines>`;
    const mistake = `<lines><line><move data-lr-ext-cls="mistake"><index>2.</index><san>d4</san></move></line></lines>`;
    markTree(tree(`${run(2, 2, 1)}${blunder}`, `${run(2, 1)}${mistake}`));
    const lines = queryAll(document, 'interrupt line', HTMLElement);
    expect(lines.map(line => line.dataset.lrExtOn ?? '-')).toEqual(['', '-', '-', '-']);
    expect(lines.map(line => line.dataset.lrExtWorst ?? '-')).toEqual([
      '-',
      'blunder',
      '-',
      'mistake',
    ]);
  });
});
