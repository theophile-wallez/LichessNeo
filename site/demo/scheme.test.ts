import { beforeEach, describe, expect, it } from 'vitest';
import { html, setHtml } from '#shared/html.ts';
import { queryAll } from '#shared/dom.ts';
import { showScheme } from './scheme.ts';

const pressed = (): string[] =>
  queryAll(document, '[data-scheme-pick]', HTMLElement)
    .filter(button => button.getAttribute('aria-pressed') === 'true')
    .map(button => button.dataset.schemePick ?? '');

beforeEach(() => {
  delete document.documentElement.dataset.scheme;
  localStorage.clear();
  setHtml(
    document.body,
    html`<button data-scheme-pick="dark" aria-pressed="true"></button
      ><button data-scheme-pick="light" aria-pressed="false"></button>`,
  );
});

describe('the page’s scheme', () => {
  it('turns light, keeps it for the next visit and presses Light', async () => {
    await showScheme(document.body, true);
    expect(document.documentElement.dataset.scheme).toBe('light');
    expect(localStorage.getItem('lichess-neo-site-scheme')).toBe('light');
    expect(pressed()).toEqual(['light']);
  });

  it('turns back dark, forgetting the light one', async () => {
    await showScheme(document.body, true);
    await showScheme(document.body, false);
    expect(document.documentElement.dataset.scheme).toBeUndefined();
    expect(localStorage.getItem('lichess-neo-site-scheme')).toBeNull();
    expect(pressed()).toEqual(['dark']);
  });

  it('leaves the page as it is when already in that scheme', async () => {
    await showScheme(document.body, false);
    expect(localStorage.getItem('lichess-neo-site-scheme')).toBeNull();
  });
});
