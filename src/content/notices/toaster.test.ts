import Megaphone01Icon from '@hugeicons/core-free-icons/Megaphone01Icon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { Toaster } from './toaster.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

const toasts = (): HTMLElement[] => queryAll(document, '.lr-ext-toast', HTMLElement);
const text = (toast: Element | undefined, part: string): string =>
  toast?.querySelector(`.lr-ext-toast__${part}`)?.textContent ?? '';

describe('Toaster', () => {
  it('shows a toast, the newest in front', () => {
    const toaster = new Toaster('Close');
    toaster.show('a', { kind: 'info', icon: Megaphone01Icon, title: 'First' });
    toaster.show('b', { kind: 'success', icon: Tick02Icon, title: 'Second' });
    const [front, back] = toasts();
    expect(text(front, 'title')).toBe('Second');
    expect(front?.dataset.lrExtKind).toBe('success');
    expect('lrExtFront' in (front?.dataset ?? {})).toBe(true);
    expect(text(back, 'title')).toBe('First');
    expect(Number(front?.style.zIndex)).toBeGreaterThan(Number(back?.style.zIndex));
  });

  it('changes the toast shown under the same id in place', () => {
    const toaster = new Toaster('Close');
    toaster.show('a', { kind: 'info', icon: Megaphone01Icon, title: 'Restart', chip: '1:00' });
    const [toast] = toasts();
    toaster.show('a', { kind: 'info', icon: Megaphone01Icon, title: 'Restart', chip: '0:59' });
    expect(toasts()).toEqual([toast]);
    expect(text(toast, 'chip')).toBe('0:59');
  });

  it('hides the chip and the close button it has no use for', () => {
    new Toaster('Close').show('a', { kind: 'info', icon: Megaphone01Icon, title: 'Hello' });
    const [toast] = toasts();
    expect(toast && queryOne(toast, '.lr-ext-toast__chip', HTMLElement)?.hidden).toBe(true);
    expect(toast && queryOne(toast, '.lr-ext-toast__close', HTMLElement)?.hidden).toBe(true);
  });

  it('closes on its button, says so, and leaves once out', () => {
    const onClose = vi.fn<() => void>();
    const toaster = new Toaster('Close');
    toaster.show('a', {
      kind: 'info',
      icon: Megaphone01Icon,
      title: 'Hello',
      closeButton: true,
      onClose,
    });
    const close = queryOne(document, '.lr-ext-toast__close', HTMLButtonElement);
    expect(close?.getAttribute('aria-label')).toBe('Close');
    close?.click();
    expect(onClose).toHaveBeenCalledOnce();
    expect('lrExtRemoved' in (toasts()[0]?.dataset ?? {})).toBe(true);
    vi.advanceTimersByTime(400);
    expect(toasts()).toEqual([]);
  });

  it('goes after its duration, held while the pointer is over the stack', () => {
    const toaster = new Toaster('Close');
    toaster.show('a', { kind: 'success', icon: Tick02Icon, title: 'Back', duration: 2500 });
    const list = document.querySelector('.lr-ext-toaster');
    vi.advanceTimersByTime(1000);
    list?.dispatchEvent(new MouseEvent('mouseenter'));
    expect(list instanceof HTMLElement && list.dataset.lrExtExpanded).toBe('');
    vi.advanceTimersByTime(5000);
    expect(toasts()[0]?.dataset.lrExtRemoved).toBeUndefined();
    list?.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(1400);
    expect(toasts()[0]?.dataset.lrExtRemoved).toBeUndefined();
    vi.advanceTimersByTime(100);
    expect(toasts()[0]?.dataset.lrExtRemoved).toBe('');
  });
});
