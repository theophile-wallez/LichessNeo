import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { message } from './runtime.ts';

// An English Chrome: chrome.i18n answers with the names it was asked for.
beforeEach(() => {
  vi.stubGlobal('chrome', {
    i18n: {
      getMessage: (name: string) => (name === 'messagesLanguage' ? 'en' : `[${name}]`),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.lang = '';
});

describe('message', () => {
  it('asks chrome.i18n on a page in its language', () => {
    document.documentElement.lang = 'en-US';
    expect(message('pdashAgainst', '1500')).toBe('[pdashAgainst]');
  });

  it('reads the bundled messages on a page in another language', () => {
    document.documentElement.lang = 'fr-FR';
    expect(message('pdashAgainst', '1500')).toBe('face à des problèmes classés 1500');
  });
});
