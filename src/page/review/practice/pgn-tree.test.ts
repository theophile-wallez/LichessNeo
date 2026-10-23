import { describe, expect, it } from 'vitest';
import { type PgnTree, parseMovetext, parsePgn, writeMovetext } from './pgn-tree.ts';

/** The tree's lines as text, a move's variations in brackets after it: "e4 [e5 Nf3 | c5]". */
function shape(tree: PgnTree): string {
  return tree.children
    .map(child => {
      const comment = child.comment ? ` {${child.comment}}` : '';
      const next = child.children.length > 0 ? ` [${shape(child)}]` : '';
      return `${child.san}${comment}${next}`;
    })
    .join(' | ');
}

const SICILIAN_OR_OPEN = '1. e4 e5 (1... c5 2. Nf3) 2. Nf3 {A comment} Nc6 $1 *';

describe('parseMovetext', () => {
  it('reads the moves, their variations and their comments', () => {
    const tree = parseMovetext(SICILIAN_OR_OPEN);
    expect(shape(tree)).toBe('e4 [e5 [Nf3 {A comment} [Nc6]] | c5 [Nf3]]');
    expect(tree.comment).toBe('');
  });

  it('gives a comment before the first move to the start', () => {
    const tree = parseMovetext('{ The Italian } 1. e4 { the king’s pawn } { twice } e5 1-0');
    expect(tree.comment).toBe('The Italian');
    expect(tree.children[0]?.comment).toBe('the king’s pawn twice');
  });

  it('nests variations, each from the position before its move', () => {
    const tree = parseMovetext('1. e4 (1. d4 d5 (1... Nf6 2. c4) 2. c4) 1... e5 2. Nf3 *');
    expect(shape(tree)).toBe('e4 [e5 [Nf3]] | d4 [d5 [c4] | Nf6 [c4]]');
  });

  it('skips move numbers, NAGs, results and line comments', () => {
    const tree = parseMovetext('1. e4 $2 ; a line comment\n1... e5!? 2. Nf3 1/2-1/2');
    expect(shape(tree)).toBe('e4 [e5!? [Nf3]]');
    expect(shape(parseMovetext('*'))).toBe('');
  });

  it('survives a bracket that closes nothing', () => {
    expect(shape(parseMovetext('1. e4 ) e5'))).toBe('e4 [e5]');
  });
});

describe('parsePgn', () => {
  it('reads each game’s tags and moves', () => {
    const games = parsePgn(
      [
        '[Event "Repertoire: \\"Italian\\""]',
        '[ChapterURL "https://lichess.org/study/abcd1234/efgh5678"]',
        '',
        '1. e4 e5 *',
        '',
        '',
        '[Event "Second"]',
        '[Orientation "black"]',
        '',
        '1. d4 *',
      ].join('\n'),
    );
    expect(games).toHaveLength(2);
    expect(games[0]?.tags.get('Event')).toBe('Repertoire: "Italian"');
    expect(games[0]?.tags.get('ChapterURL')).toBe('https://lichess.org/study/abcd1234/efgh5678');
    expect(shape(games[0]?.tree ?? { comment: '', children: [] })).toBe('e4 [e5]');
    expect(games[1]?.tags.get('Orientation')).toBe('black');
    expect(shape(games[1]?.tree ?? { comment: '', children: [] })).toBe('d4');
  });

  it('reads movetext without tags, and nothing from an empty export', () => {
    expect(parsePgn('1. e4 *').map(game => shape(game.tree))).toEqual(['e4']);
    expect(parsePgn('')).toEqual([]);
    expect(parsePgn('\n\n')).toEqual([]);
  });
});

describe('writeMovetext', () => {
  it('writes the moves with their numbers, Black’s again after a variation or a comment', () => {
    expect(writeMovetext(parseMovetext(SICILIAN_OR_OPEN))).toBe(
      '1. e4 e5 (1... c5 2. Nf3) 2. Nf3 { A comment } 2... Nc6 *',
    );
    expect(writeMovetext(parseMovetext('{ Intro } 1. e4 e5 2. Nf3'))).toBe(
      '{ Intro } 1. e4 e5 2. Nf3 *',
    );
    expect(writeMovetext({ comment: '', children: [] })).toBe('*');
  });

  it('writes a variation with a comment, and keeps a comment from closing early', () => {
    const tree = parseMovetext('1. e4 (1. d4 {Closed} d5) e5');
    expect(writeMovetext(tree)).toBe('1. e4 (1. d4 { Closed } 1... d5) 1... e5 *');
    const node = tree.children[0];
    if (node) node.comment = 'a } brace';
    expect(writeMovetext(tree)).toContain('{ a ) brace }');
  });

  it('reads back as the tree it was written from', () => {
    const tree = parseMovetext(
      '{ Start } 1. e4 e5 (1... c5 2. Nf3 (2. c3 d5) d6) (1... e6) 2. Nf3 { mine } Nc6 3. Bc4',
    );
    expect(parseMovetext(writeMovetext(tree))).toEqual(tree);
  });
});
