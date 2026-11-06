import { describe, expect, it, vi } from 'vitest';
import { assignPieces } from './assign.ts';
import { createSlots } from './slots.ts';

const file = (path: string): { path: string } => ({ path });

function started(...paths: string[]) {
  const files = paths.map(file);
  return { files, slots: createSlots(assignPieces(files), assignPieces) };
}

describe('createSlots', () => {
  it('starts from the files placed by their names', () => {
    const { files, slots } = started('wK.png', 'dame.png');
    expect(slots.get('wK')).toBe(files[0]);
    expect(slots.filled()).toEqual(['wK']);
    expect(slots.loose()).toEqual([files[1]]);
  });

  it('puts a file from aside in a slot, and sends what the slot held aside', () => {
    const { files, slots } = started('wK.png', 'dame.png');
    const [king, queen] = files;
    if (!king || !queen) throw new Error('No files');
    slots.put('wK', queen);
    expect(slots.get('wK')).toBe(queen);
    expect(slots.loose()).toEqual([king]);
  });

  it('moves a file from one slot to another', () => {
    const { files, slots } = started('wK.png');
    const [king] = files;
    if (!king) throw new Error('No file');
    slots.put('bQ', king);
    expect(slots.filled()).toEqual(['bQ']);
    expect(slots.loose()).toEqual([]);
  });

  it('places files added later, in place of what their slot held', () => {
    const { slots } = started('wK.png');
    const [king, odd] = [file('new/wK.svg'), file('odd.png')];
    slots.add([king, odd]);
    expect(slots.get('wK')).toBe(king);
    expect(slots.loose()).toEqual([odd]);
  });

  it('empties a slot, and tells each change', () => {
    const { slots } = started('wK.png');
    const listener = vi.fn<() => void>();
    slots.onChange(listener);
    slots.clear('wK');
    expect(slots.filled()).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
