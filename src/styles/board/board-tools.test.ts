import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

const TOOLS =
  '<main class="round"><div class="ln-ext-board-tools">' +
  '<button class="ln-ext-board-tools__btn ln-ext-board-tools__btn--menu"></button>' +
  '<button class="ln-ext-board-tools__btn ln-ext-board-tools__btn--flip"></button>' +
  '<button class="ln-ext-board-tools__btn ln-ext-board-tools__btn--bookmark"></button>' +
  '</div></main>';

const visibility = (name: string): string | undefined => {
  const button = queryOne(document, `.ln-ext-board-tools__btn--${name}`, HTMLElement);
  return button ? getComputedStyle(button).visibility : undefined;
};

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('board tools', () => {
  it('shows the bookmark star with the flip button, while the pointer is on the board', () => {
    const style = document.createElement('style');
    style.textContent = readFileSync(join(import.meta.dirname, 'board-tools.css'), 'utf8');
    document.head.append(style);
    document.body.innerHTML = TOOLS;
    expect(visibility('menu')).not.toBe('hidden');
    expect(visibility('flip')).toBe('hidden');
    expect(visibility('bookmark')).toBe('hidden');
    document.querySelector('.ln-ext-board-tools')?.classList.add('ln-ext-board-tools--hover');
    expect(visibility('bookmark')).not.toBe('hidden');
  });
});
