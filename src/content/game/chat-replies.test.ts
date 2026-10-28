import { describe, expect, it } from 'vitest';
import {
  ChatRepliesSchema,
  DEFAULT_REPLIES,
  groupOf,
  lichessReplies,
  moved,
  withEdited,
  withReply,
} from './chat-replies.ts';

describe('the chat’s quick replies', () => {
  it('are Lichess’s to begin with', () => {
    expect(DEFAULT_REPLIES).toEqual({
      start: ['Hello', 'Good luck', 'Have fun!', 'You too!'],
      end: ['Good game', 'Well played', 'Thank you', "I've got to go", 'Bye!'],
    });
    expect(lichessReplies('end')).toEqual(DEFAULT_REPLIES.end);
  });

  it('tell the group due from the keys of Lichess’s chips', () => {
    expect(groupOf(['hi', 'gl', 'hf'])).toBe('start');
    expect(groupOf(['gg', 'wp'])).toBe('end');
    expect(groupOf([])).toBeNull();
    expect(groupOf(['Hello'])).toBeNull();
  });

  it('keep each list as stored, or Lichess’s if it can’t be read', () => {
    expect(ChatRepliesSchema.parse({ start: [], end: ['GG'] })).toEqual({ start: [], end: ['GG'] });
    const tooMany = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(ChatRepliesSchema.parse({ start: tooMany, end: [''] })).toEqual(DEFAULT_REPLIES);
    expect(ChatRepliesSchema.parse({ start: ['x'.repeat(141)] }).start).toEqual(
      DEFAULT_REPLIES.start,
    );
  });

  it('take a new one, trimmed, unless it’s empty, already there, or the list is full', () => {
    expect(withReply(['GG'], '  Merci ')).toEqual(['GG', 'Merci']);
    expect(withReply(['GG'], '   ')).toBeNull();
    expect(withReply(['GG'], 'GG')).toBeNull();
    expect(withReply(['a', 'b', 'c', 'd', 'e'], 'f')).toBeNull();
  });

  it('change one in place, unless it becomes empty or another’s', () => {
    expect(withEdited(['GG', 'Merci'], 1, 'Merci beaucoup')).toEqual(['GG', 'Merci beaucoup']);
    expect(withEdited(['GG', 'Merci'], 1, 'GG')).toBeNull();
    expect(withEdited(['GG', 'Merci'], 0, '')).toBeNull();
    expect(withEdited(['GG', 'Merci'], 2, 'Salut')).toBeNull();
    expect(withEdited(['GG', 'Merci'], 0, ' GG ')).toEqual(['GG', 'Merci']);
  });

  it('move one up or down', () => {
    expect(moved(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moved(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });
});
