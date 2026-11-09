import AlertCircleIcon from '@hugeicons/core-free-icons/AlertCircleIcon';
import Tick02Icon from '@hugeicons/core-free-icons/Tick02Icon';
import { queryAll, setData } from '#shared/dom.ts';
import type { ToastContent, Toaster } from './toaster.ts';

// What Lichess says once a form is sent ("Success", a failure), a flash in the page it loads
// next: one that only says so becomes a toast, and leaves the page. A flash with a link or a
// form in it (a team without a description, a pupil's new password) stays in the page, a
// card (styles/pages/flash.css), as do Lichess's warnings, standing advice.

const SUCCESS_MS = 5000;

/**
 * The toast a flash becomes, or null for one that stays in the page. A success says
 * `successTitle` if the form's feature knew what it did (expected-flash.ts).
 */
export function flashToast(flash: Element, successTitle?: string | null): ToastContent | null {
  const content = flash.querySelector(':scope > .flash__content');
  if (!content || content.childElementCount > 0) return null;
  const title = content.textContent.replace(/\s+/g, ' ').trim();
  if (!title) return null;
  if (flash.classList.contains('flash-success'))
    return {
      kind: 'success',
      icon: Tick02Icon,
      title: successTitle ?? title,
      duration: SUCCESS_MS,
      closeButton: true,
    };
  if (flash.classList.contains('flash-failure'))
    return { kind: 'error', icon: AlertCircleIcon, title, closeButton: true };
  return null;
}

/** `successTitle`: what this page's first success says, if a form expected it. */
export function createFlashSync(toaster: Toaster, successTitle: string | null): () => void {
  const seen = new WeakSet<Element>();
  let expected = successTitle;
  let count = 0;
  return () => {
    for (const flash of queryAll(document, '.flash', HTMLElement)) {
      if (seen.has(flash)) continue;
      seen.add(flash);
      const toast = flashToast(flash, expected);
      if (!toast) continue;
      if (toast.kind === 'success') expected = null;
      setData(flash, 'lnExtToasted', '');
      toaster.show(`flash-${count++}`, toast);
    }
  };
}
