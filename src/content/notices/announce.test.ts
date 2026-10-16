import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { createAnnounceSync } from './announce.ts';
import { Toaster } from './toaster.ts';

const NOW = Date.parse('2026-10-16T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

// Lichess's markup (ui/site/src/announce.ts), its close link removing it as Lichess's does.
function announce(message: string, date: string): void {
  document.body.insertAdjacentHTML(
    'beforeend',
    `<div id="announce" class="announce">${message}<time class="timeago" datetime="${date}">in 1 minute</time><div class="actions"><a class="close">X</a></div></div>`,
  );
  queryOne(document, '#announce .close', HTMLElement)?.addEventListener('click', () =>
    document.getElementById('announce')?.remove(),
  );
}

const shown = (): HTMLElement[] =>
  queryAll(document, '.lr-ext-toast:not([data-lr-ext-removed])', HTMLElement);
const part = (name: string): string =>
  queryOne(shown()[0] ?? document, `.lr-ext-toast__${name}`, HTMLElement)?.textContent ?? '';

describe('the announcement’s toast', () => {
  it('says the message, and counts down to its date', () => {
    const sync = createAnnounceSync(new Toaster('Close'));
    announce('Lichess will restart. ', '2026-10-16T12:01:30Z');
    sync();
    expect(part('title')).toBe('Lichess will restart.');
    expect(part('chip')).toBe('1:30');
    vi.setSystemTime(NOW + 31_000);
    sync();
    expect(part('chip')).toBe('0:59');
    expect(shown()).toHaveLength(1);
  });

  it('closes Lichess’s with its own', () => {
    const sync = createAnnounceSync(new Toaster('Close'));
    announce('Lichess will restart. ', '2026-10-16T12:01:30Z');
    sync();
    queryOne(document, '.lr-ext-toast__close', HTMLButtonElement)?.click();
    expect(document.getElementById('announce')).toBeNull();
    expect(shown()).toEqual([]);
  });

  it('goes when Lichess removes it', () => {
    const sync = createAnnounceSync(new Toaster('Close'));
    announce('Lichess will restart. ', '2026-10-16T12:01:30Z');
    sync();
    document.getElementById('announce')?.remove();
    sync();
    expect(shown()).toEqual([]);
  });
});
