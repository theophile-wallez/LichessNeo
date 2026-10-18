import Cancel01Icon from '@hugeicons/core-free-icons/Cancel01Icon';
import { createElement, setData, setStyleProperty } from '#shared/dom.ts';
import { hugeicon, type HugeIcon } from '#shared/hugeicons.ts';
import { setHtml } from '#shared/html.ts';
import { placements } from './stack.ts';
import { makeSwipeable } from './swipe.ts';

// Toasts in Sonner's way (styles/theme/notices.css): stacked in the window's corner, the newest
// in front, spread out under the pointer, which also holds their timers, and swiped away.

export type ToastKind = 'loading' | 'error' | 'success' | 'info';

export interface ToastContent {
  readonly kind: ToastKind;
  readonly icon: HugeIcon;
  readonly title: string;
  /** A short value beside the title, such as a countdown. */
  readonly chip?: string | undefined;
  /** How long it shows, in ms; without one, until it's dismissed. */
  readonly duration?: number;
  readonly closeButton?: boolean;
  /** Called when the user closes it, with its button or a swipe. */
  readonly onClose?: () => void;
}

interface Toast {
  readonly id: string;
  readonly element: HTMLLIElement;
  readonly body: HTMLElement;
  readonly title: HTMLElement;
  readonly chip: HTMLElement;
  readonly close: HTMLButtonElement;
  content: ToastContent;
  timer: number;
  /** What's left of its duration, and since when it runs. */
  remaining: number;
  since: number;
}

/** The exit's length, after which a dismissed toast leaves the DOM. */
const EXIT_MS = 400;

export class Toaster {
  readonly #list = createElement('ol', {
    className: 'ln-ext-toaster',
    attrs: { 'aria-live': 'polite' },
  });
  /** The newest first. */
  #toasts: Toast[] = [];
  #hovered = false;
  readonly #closeLabel: string;

  constructor(closeLabel: string) {
    this.#closeLabel = closeLabel;
    this.#list.addEventListener('mouseenter', () => this.#hover(true));
    this.#list.addEventListener('mouseleave', () => this.#hover(false));
    document.addEventListener('visibilitychange', () => this.#holdTimers());
  }

  /** Shows a toast, or changes the one already shown under `id`. */
  show(id: string, content: ToastContent): void {
    const toast = this.#toasts.find(shown => shown.id === id);
    if (toast) this.#update(toast, content);
    else this.#add(id, content);
  }

  dismiss(id: string): void {
    const toast = this.#toasts.find(shown => shown.id === id);
    if (!toast) return;
    clearTimeout(toast.timer);
    this.#toasts = this.#toasts.filter(shown => shown !== toast);
    setData(toast.element, 'lnExtRemoved', '');
    toast.element.removeAttribute('role');
    setTimeout(() => toast.element.remove(), EXIT_MS);
    if (this.#toasts.length === 0) this.#hovered = false;
    this.#layout();
  }

  #add(id: string, content: ToastContent): void {
    if (!this.#list.isConnected) document.body.append(this.#list);
    const element = createElement('li', { className: 'ln-ext-toast', attrs: { role: 'status' } });
    const body = createElement('div', { className: 'ln-ext-toast__body' });
    const title = createElement('span', { className: 'ln-ext-toast__title' });
    const chip = createElement('span', { className: 'ln-ext-toast__chip' });
    const close = createElement('button', {
      className: 'ln-ext-toast__close',
      attrs: { type: 'button', 'aria-label': this.#closeLabel },
    });
    setHtml(close, hugeicon(Cancel01Icon));
    body.append(createElement('span', { className: 'ln-ext-toast__icon' }), title, chip, close);
    element.append(body);
    const toast: Toast = {
      id,
      element,
      body,
      title,
      chip,
      close,
      content,
      timer: 0,
      remaining: 0,
      since: 0,
    };
    close.addEventListener('click', () => this.#closeByUser(toast));
    makeSwipeable(element, () => this.#closeByUser(toast));
    this.#toasts.unshift(toast);
    this.#list.prepend(element);
    this.#render(toast, content, null);
    this.#arm(toast);
    // The layout reads the heights, which sets the toast below the window before it slides in.
    this.#layout();
    setData(element, 'lnExtMounted', '');
  }

  #update(toast: Toast, content: ToastContent): void {
    const before = toast.content;
    toast.content = content;
    this.#render(toast, content, before);
    if (before.kind !== content.kind || before.duration !== content.duration) this.#arm(toast);
    if (before.title !== content.title || before.chip !== content.chip) this.#layout();
  }

  /** Writes only what changed since `before`: the countdown's toast is shown again every tick. */
  #render(toast: Toast, content: ToastContent, before: ToastContent | null): void {
    setData(toast.element, 'lnExtKind', content.kind);
    if (content.icon !== before?.icon) {
      // A new tile rather than a new icon in the old one, so it pops in again.
      const icon = createElement('span', { className: 'ln-ext-toast__icon' });
      setHtml(icon, hugeicon(content.icon));
      toast.body.firstElementChild?.replaceWith(icon);
    }
    if (toast.title.textContent !== content.title) toast.title.textContent = content.title;
    const chip = content.chip ?? '';
    if (toast.chip.textContent !== chip) toast.chip.textContent = chip;
    toast.chip.hidden = chip === '';
    toast.close.hidden = content.closeButton !== true;
  }

  #closeByUser(toast: Toast): void {
    this.dismiss(toast.id);
    toast.content.onClose?.();
  }

  #arm(toast: Toast): void {
    clearTimeout(toast.timer);
    toast.timer = 0;
    toast.remaining = toast.content.duration ?? Infinity;
    this.#run(toast);
  }

  #run(toast: Toast): void {
    if (!Number.isFinite(toast.remaining) || this.#held()) return;
    toast.since = performance.now();
    toast.timer = window.setTimeout(() => this.dismiss(toast.id), toast.remaining);
  }

  #held(): boolean {
    return this.#hovered || document.hidden;
  }

  /** Stops the timers while the stack is under the pointer or the tab hidden, and runs them on. */
  #holdTimers(): void {
    for (const toast of this.#toasts) {
      if (this.#held()) {
        if (!toast.timer) continue;
        clearTimeout(toast.timer);
        toast.timer = 0;
        toast.remaining -= performance.now() - toast.since;
      } else if (!toast.timer) {
        this.#run(toast);
      }
    }
  }

  #hover(hovered: boolean): void {
    this.#hovered = hovered && this.#toasts.length > 0;
    setData(this.#list, 'lnExtExpanded', this.#hovered ? '' : null);
    this.#holdTimers();
    this.#layout();
  }

  #layout(): void {
    // The body's own size, which the toast's doesn't hold back, and the border around it.
    const sizes = this.#toasts.map(({ element, body }) => ({
      width: body.offsetWidth + element.clientLeft * 2,
      height: body.offsetHeight + element.clientTop * 2,
    }));
    const places = placements(sizes, this.#hovered);
    for (const [i, toast] of this.#toasts.entries()) {
      const place = places[i];
      if (!place) continue;
      setStyleProperty(toast.element, '--ln-ext-toast-y', `${place.y}px`);
      setStyleProperty(toast.element, '--ln-ext-toast-scale', String(place.scale));
      setStyleProperty(toast.element, '--ln-ext-toast-w', `${place.size.width}px`);
      setStyleProperty(toast.element, '--ln-ext-toast-h', `${place.size.height}px`);
      // The newest is added first in the list: it's drawn over the others all the same.
      setStyleProperty(toast.element, 'z-index', String(this.#toasts.length - i));
      setData(toast.element, 'lnExtFront', i === 0 ? '' : null);
      setData(toast.element, 'lnExtHidden', place.hidden ? '' : null);
    }
  }
}
