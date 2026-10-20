import { describe, expect, it } from 'vitest';
import { recordedTakePaths, RecordedSoundsResponseSchema } from './recorded-sounds.ts';

describe('recordedTakePaths', () => {
  it('names each take of each sound, first take first, in the sounds’ order', () => {
    const paths = recordedTakePaths();
    expect([...paths.keys()].slice(0, 3)).toEqual(['move-self', 'move-opponent', 'move-check']);
    expect(paths.get('castle')).toEqual([
      'sounds/boxwood/castle-1.ogg',
      'sounds/boxwood/castle-2.ogg',
      'sounds/boxwood/castle-3.ogg',
      'sounds/boxwood/castle-4.ogg',
    ]);
    expect(paths.get('move-slide')).toHaveLength(18);
    expect(paths.has('notify')).toBe(false);
  });
});

// Whether an answer of one take, at `url`, is one the content script reads.
const isRead = (url: string): boolean =>
  RecordedSoundsResponseSchema.safeParse({ sounds: { capture: [url] } }).success;

describe('RecordedSoundsResponseSchema', () => {
  it('takes Ogg data: URLs, and nothing else', () => {
    expect(isRead('data:audio/ogg;base64,T2dnUw==')).toBe(true);
    expect(isRead('data:text/html;base64,PGI+')).toBe(false);
    expect(isRead('https://example.com/capture.ogg')).toBe(false);
  });
});
