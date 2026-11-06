import { describe, expect, it } from 'vitest';
import { assignPieces, assignSounds, groupsFor, wrongFiles } from './assign.ts';

interface Named {
  readonly path: string;
}

const file = (path: string): Named => ({ path });
const files = (...paths: string[]): Named[] => paths.map(file);

describe('assignPieces', () => {
  it('puts each file in the slot its name says, and the rest aside', () => {
    const [king, queen, odd] = [file('wK.png'), file('black-queen.png'), file('dame.png')];
    const assigned = assignPieces([king, queen, odd]);
    expect([...assigned.slots]).toEqual([
      ['wK', king],
      ['bQ', queen],
    ]);
    expect(assigned.loose).toEqual([odd]);
  });

  it('leaves aside the second file for one slot', () => {
    const [first, second] = [file('wK.png'), file('white-king.svg')];
    const assigned = assignPieces([first, second]);
    expect(assigned.slots.get('wK')).toBe(first);
    expect(assigned.loose).toEqual([second]);
  });
});

describe('assignSounds', () => {
  it('puts each sound in its row', () => {
    const [move, boom] = [file('Move.mp3'), file('boom.ogg')];
    const assigned = assignSounds([move, boom]);
    expect([...assigned.slots]).toEqual([['move-self', move]]);
    expect(assigned.loose).toEqual([boom]);
  });
});

describe('groupsFor', () => {
  it('makes a piece set or a sound set of each folder, of the files it takes', () => {
    const dropped = files('a/wK.png', 'a/wQ.png', 'b/wK.png', 'a/move.mp3', 'a/notes.txt');
    expect(groupsFor('piece', dropped).map(group => group.map(file => file.path))).toEqual([
      ['a/wK.png', 'a/wQ.png'],
      ['b/wK.png'],
    ]);
    expect(groupsFor('sound', dropped).map(group => group.map(file => file.path))).toEqual([
      ['a/move.mp3'],
    ]);
  });

  it('makes a board of each image', () => {
    expect(groupsFor('board', files('maple.png', 'mint.webp', 'move.mp3'))).toHaveLength(2);
  });
});

describe('wrongFiles', () => {
  it('finds the files of the other kind, not the ones of no kind', () => {
    const dropped = files('wK.png', 'move.mp3', 'README.md');
    expect(wrongFiles('piece', dropped).map(file => file.path)).toEqual(['move.mp3']);
    expect(wrongFiles('sound', dropped).map(file => file.path)).toEqual(['wK.png']);
  });
});
