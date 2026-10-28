import { describe, expect, it } from 'vitest';
import { bundledMessage } from './messages.ts';

describe('bundledMessage', () => {
  it('reads a message in either language, its placeholders filled in', () => {
    expect(bundledMessage('en', 'pdashAgainst', ['1500'])).toBe('vs puzzles rated 1500');
    expect(bundledMessage('fr', 'pdashAgainst', ['1500'])).toBe(
      'face à des problèmes classés 1500',
    );
  });

  it('is empty for a message there is none of, as chrome.i18n is', () => {
    expect(bundledMessage('fr', 'noSuchMessage', [])).toBe('');
  });
});
