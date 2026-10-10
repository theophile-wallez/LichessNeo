import { describe, expect, it } from 'vitest';
import { videoCount } from './video-count.ts';

describe("the video library's count", () => {
  it('reads the one number in the intro, in any language', () => {
    expect(videoCount('We have carefully selected 1547 videos so far!')).toBe(1547);
    expect(videoCount('Nous avons sélectionné 1 547 vidéos jusqu’ici !')).toBe(1547);
    expect(videoCount('Wir haben 1.547 Videos ausgewählt.')).toBe(1547);
  });

  it('gives up without exactly one number, so the intro stays', () => {
    expect(videoCount('All videos are free for everyone.')).toBeNull();
    expect(videoCount('1547 videos in 3 years')).toBeNull();
  });
});
