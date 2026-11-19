import { describe, expect, it } from 'vitest';
import { commentShapes } from './shapes.ts';

describe('commentShapes', () => {
  it('reads rings and arrows in the tone nearest their brush', () => {
    expect(commentShapes('The centre. [%csl Gd5,Re4][%cal Ye2e4,Bg1f3]')).toEqual({
      text: 'The centre.',
      marks: [
        { kind: 'ring', square: 'd5', tone: 'defense' },
        { kind: 'ring', square: 'e4', tone: 'attack' },
        { kind: 'link', from: 'e2', to: 'e4', tone: 'plan' },
        { kind: 'link', from: 'g1', to: 'f3', tone: 'plan' },
      ],
    });
  });

  it('takes the commands out of the text wherever they stand', () => {
    expect(commentShapes('[%cal Ge2e4] Push [e4] now. [%csl Rd5]').text).toBe('Push [e4] now.');
  });

  it('leaves out a shape it cannot draw', () => {
    const { marks } = commentShapes('[%csl Xd5,Gd9,Ge2e4][%cal Ge4e4,Re4]');
    expect(marks).toEqual([]);
  });

  it('keeps a comment without commands as it is', () => {
    expect(commentShapes('[Nf3] develops.')).toEqual({ text: '[Nf3] develops.', marks: [] });
  });
});
