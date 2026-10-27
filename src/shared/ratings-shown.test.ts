import { afterEach, describe, expect, it } from 'vitest';
import { ratingsShown } from './ratings-shown.ts';

afterEach(() => {
  document.body.className = '';
});

describe('ratingsShown', () => {
  it('follows Lichess’s `no-rating` on <body>', () => {
    document.body.className = 'coords-in';
    expect(ratingsShown()).toBe(true);
    document.body.className = 'coords-in no-rating playing';
    expect(ratingsShown()).toBe(false);
  });
});
