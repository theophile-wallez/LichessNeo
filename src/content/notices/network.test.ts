import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { createNetworkSync } from './network.ts';
import { Toaster } from './toaster.ts';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
  document.body.className = '';
});

// Lichess's markup, as its socket leaves it once it gives up waiting for a pong.
function goOffline(words: string): void {
  document.body.className = 'offline';
  document.body.insertAdjacentHTML('beforeend', `<div id="network-status">${words}</div>`);
}

function goOnline(): void {
  document.body.className = 'online';
  document.getElementById('network-status')?.remove();
}

const front = (): HTMLElement | undefined =>
  queryAll(document, '.ln-ext-toast:not([data-ln-ext-removed])', HTMLElement)[0];
const title = (): string =>
  queryOne(document, '.ln-ext-toast__title', HTMLElement)?.textContent ?? '';

describe('the connection’s toast', () => {
  it('says Lichess’s words while it reconnects, then that it’s back', () => {
    const sync = createNetworkSync(new Toaster('Close'), 'Connected again');
    sync();
    expect(front()).toBeUndefined();
    goOffline('Reconnecting');
    sync();
    expect(front()?.dataset.lnExtKind).toBe('loading');
    expect(title()).toBe('Reconnecting');
    goOnline();
    sync();
    expect(front()?.dataset.lnExtKind).toBe('success');
    expect(title()).toBe('Connected again');
  });

  it('shows the browser offline as an error', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const sync = createNetworkSync(new Toaster('Close'), 'Connected again');
    goOffline('Offline');
    sync();
    expect(front()?.dataset.lnExtKind).toBe('error');
  });

  it('stays away once swiped off, until the connection is back', () => {
    const sync = createNetworkSync(new Toaster('Close'), 'Connected again');
    goOffline('Reconnecting');
    sync();
    const toast = front();
    toast?.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: 0, clientY: 0 }));
    toast?.dispatchEvent(new PointerEvent('pointermove', { clientX: 200, clientY: 0 }));
    toast?.dispatchEvent(new PointerEvent('pointerup', { clientX: 200, clientY: 0 }));
    expect(front()).toBeUndefined();
    sync();
    expect(front()).toBeUndefined();
    goOnline();
    sync();
    expect(title()).toBe('Connected again');
  });
});
