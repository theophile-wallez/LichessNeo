import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncColumnFocus } from './event-columns.ts';

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('event columns focus', () => {
  const html = '<main class="swiss"><div class="swiss__main"></div></main>';

  it('gives the middle column the focus once, from 1260px', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    document.body.innerHTML = html;
    syncColumnFocus();
    const column = document.querySelector('.swiss__main');
    expect(column?.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(column);
  });

  it('keeps the focus where it is, and does nothing on narrow windows', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    document.body.innerHTML = html;
    syncColumnFocus();
    expect(document.querySelector('.swiss__main')?.hasAttribute('tabindex')).toBe(false);
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    document.body.insertAdjacentHTML('afterbegin', '<input id="search">');
    document.getElementById('search')?.focus();
    syncColumnFocus();
    expect(document.activeElement?.id).toBe('search');
    expect(document.querySelector('.swiss__main')?.getAttribute('tabindex')).toBe('-1');
  });
});
