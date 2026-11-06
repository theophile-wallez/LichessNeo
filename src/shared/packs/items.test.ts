import { describe, expect, it } from 'vitest';
import { fakePack, SOUND } from '#shared/testing/packs.ts';
import { fileItems, isFileItem, itemNamed, kindOf, onlyPart, renamed } from './items.ts';
import type { Pack } from './pack.ts';

const item = (id: string, kind: 'board' | 'piece' | 'sound', name: string): Pack => ({
  ...fakePack(`file:${id}/`, [kind]),
  name,
});

const counter = (): (() => string) => {
  let next = 0;
  return () => `file:new-${++next}/`;
};

describe('onlyPart and kindOf', () => {
  it("keep a pack's part of one kind", () => {
    const part = onlyPart(fakePack('a/b/main/'), 'piece');
    expect(part.pieces).toBeDefined();
    expect(part.board).toBeUndefined();
    expect(part.sounds).toBeUndefined();
    expect(kindOf(part)).toBe('piece');
  });
});

describe('itemNamed', () => {
  it("finds the user's own item of that kind and name, in any case", () => {
    const board = item('1', 'board', 'Maple');
    const packs = [fakePack('a/b/main/'), board, item('2', 'piece', 'Maple')];
    expect(itemNamed(packs, { kind: 'board', name: ' maple ' })).toBe(board);
    expect(itemNamed(packs, { kind: 'sound', name: 'Maple' })).toBeUndefined();
  });

  it("leaves a GitHub pack's parts alone", () => {
    expect(
      itemNamed([fakePack('a/b/main/', ['board'])], { kind: 'board', name: 'Pack a/b/main/' }),
    ).toBeUndefined();
  });
});

describe('fileItems', () => {
  it('makes a new item of each dropped part', () => {
    const items = fileItems([{ ...fakePack('local/', ['board']), name: 'Harbor' }], {
      stored: [],
      newId: counter(),
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('file:new-1/');
    expect(items[0] && isFileItem(items[0])).toBe(true);
  });

  it('takes the place of the item of its kind and name', () => {
    const stored = [item('old', 'piece', 'Mochi')];
    const items = fileItems([{ ...fakePack('local/', ['piece']), name: 'mochi' }], {
      stored,
      newId: counter(),
    });
    expect(items[0]?.id).toBe('file:old/');
    expect(items[0]?.name).toBe('mochi');
  });

  it("keeps the sounds a sound set isn't given again", () => {
    const stored = [
      { ...item('old', 'sound', 'Clicks'), sounds: { capture: SOUND, notify: SOUND } },
    ];
    const dropped = { ...fakePack('local/', ['sound']), name: 'Clicks', sounds: { castle: SOUND } };
    const [merged] = fileItems([dropped], { stored, newId: counter() });
    expect(Object.keys(merged?.sounds ?? {}).toSorted()).toEqual(['capture', 'castle', 'notify']);
  });
});

describe('renamed', () => {
  it('trims the name, and refuses an empty one', () => {
    const board = item('1', 'board', 'Maple');
    expect(renamed(board, '  Harbor  ')?.name).toBe('Harbor');
    expect(renamed(board, 'x'.repeat(50))?.name).toHaveLength(40);
    expect(renamed(board, '   ')).toBeNull();
  });
});
