import { afterEach, describe, expect, it } from 'vitest';
import { keepPoolsTabForPoolLink } from './lobby-pools.ts';

afterEach(() => {
  localStorage.clear();
  history.replaceState(null, '', '/');
});

describe('a pool link', () => {
  it("puts Lichess's lobby back on its pools tab before it boots", () => {
    localStorage.setItem('lobby.tab:eresy', 'real_time');
    localStorage.setItem('lobby.tab:-', 'seeks');
    localStorage.setItem('lobby.mode:eresy', 'list');
    history.replaceState(null, '', '/#pool/2+1');
    keepPoolsTabForPoolLink();
    expect(localStorage.getItem('lobby.tab:eresy')).toBe('pools');
    expect(localStorage.getItem('lobby.tab:-')).toBe('pools');
    expect(localStorage.getItem('lobby.mode:eresy')).toBe('list');
  });

  it('leaves the stored tab alone otherwise', () => {
    localStorage.setItem('lobby.tab:eresy', 'real_time');
    history.replaceState(null, '', '/#hook');
    keepPoolsTabForPoolLink();
    expect(localStorage.getItem('lobby.tab:eresy')).toBe('real_time');
  });
});
