import { afterEach, describe, expect, it } from 'vitest';
import { createSessionSync } from './session.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('session chips', () => {
  it('scrolls to the latest chip when one is added', () => {
    document.body.innerHTML =
      '<main class="puzzle"><div class="puzzle__session"><a></a></div></main>';
    const session = document.querySelector('.puzzle__session');
    if (!(session instanceof HTMLElement)) throw new Error('no session');
    Object.defineProperty(session, 'scrollWidth', { value: 500 });
    const sync = createSessionSync();
    sync();
    expect(session.scrollLeft).toBe(500);
    session.scrollLeft = 20;
    sync();
    expect(session.scrollLeft).toBe(20);
    session.append(document.createElement('a'));
    sync();
    expect(session.scrollLeft).toBe(500);
  });
});
