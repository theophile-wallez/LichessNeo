import { describe, expect, it } from 'vitest';
import { type StudyPosition, studyPositions } from './study.ts';
import { studyText } from './study-text.ts';

/** The position after `moves`, its comment `comment`, as the study has it. */
function positionAfter(moves: string, comment: string): StudyPosition {
  const positions = studyPositions(`[Event "Test"]\n\n${moves} { ${comment} } *`);
  const [position] = positions.values();
  if (!position || positions.size !== 1) throw new Error(`no position after ${moves}`);
  return position;
}

const text = (moves: string, comment: string): string => studyText(positionAfter(moves, comment));

describe('studyText', () => {
  it('makes a move the side to move can play a chip it plays', () => {
    expect(text('1. e4 e5', 'Then [Nf3].')).toBe('Then [[m:w:Nf3@a:g1f3]].');
  });

  it('plays a sequence move after move from the position', () => {
    expect(text('1. e4 e5', '[Nf3 Nc6 Bb5]')).toBe(
      '[[m:w:Nf3@a:g1f3]] [[m:b:Nc6@a:g1f3,b8c6]] [[m:w:Bb5@a:g1f3,b8c6,f1b5]]',
    );
  });

  it('writes a sequence of the other side first as chips it can’t play', () => {
    expect(text('1. e4 e5', '[Nc6 Nf3]')).toBe('[[m:b:Nc6]] [[m:w:Nf3]]');
  });

  it('gives a plan, one move of its own away, to the side that can make it', () => {
    expect(text('1. e4 e5 2. Nf3', 'White eyes [Bb5].')).toBe('White eyes [[m:w:Bb5]].');
    expect(text('1. e4', 'Black may pin with [Bb4].')).toBe('Black may pin with [[m:b:Bb4]].');
  });

  it('names a move of the line by its side', () => {
    expect(text('1. e4 e5 2. Nf3 Nc6', 'After [e4], …')).toBe('After [[m:w:e4]], …');
  });

  it('writes a later move of either side as named', () => {
    expect(text('1. e4 e5', '[w:Re1] and [b:Re8]')).toBe('[[m:w:Re1]] and [[m:b:Re8]]');
    expect(text('1. e4 e5', '[w:Nf3 Nc6]')).toBe('w:Nf3 Nc6');
  });

  it('writes a square in bold', () => {
    expect(text('1. e4 e5', 'The pawn on e5, and d4.')).toBe('The pawn on [[s:e5]], and [[s:d4]].');
  });

  it('reads doubled brackets as single ones, never as the coach’s tokens', () => {
    expect(text('1. e4 e5', '[[Nf3]] or [[p:wq]]')).toBe('[[m:w:Nf3@a:g1f3]] or p:wq');
  });

  it('leaves a move no side can play, and what is no move, as plain text', () => {
    expect(text('1. e4 e5', '[Kd5] [hello] [Nf3 Nf3]')).toBe('Kd5 hello Nf3 Nf3');
  });

  it('plays Black’s moves for Black', () => {
    expect(text('1. d4', 'Then [Nf6].')).toBe('Then [[m:b:Nf6@a:g8f6]].');
  });
});
