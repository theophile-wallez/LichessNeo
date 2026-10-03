import type { ConsoleMessage, Page } from '@playwright/test';
import { EXTENSION_ORIGIN } from './extension.ts';

// Errors from the extension's scripts. Lichess logs its own now and then (a
// 404 from the cloud eval, a 401 from the explorer when signed out): those
// aren't ours. Ours carry the extension's prefix or its URL in their stack.

const LOG_PREFIX = '[LichessReimagined]';

export interface ExtensionError {
  readonly kind: 'exception' | 'console';
  readonly page: string;
  readonly text: string;
}

export const isFromExtension = (text: string): boolean =>
  text.includes(LOG_PREFIX) || text.includes(EXTENSION_ORIGIN);

function consoleError(message: ConsoleMessage): string | null {
  if (message.type() !== 'error') return null;
  const text = message.text();
  // A bundled file that fails to load is reported at its own URL.
  const fromUs = isFromExtension(text) || message.location().url.startsWith(EXTENSION_ORIGIN);
  return fromUs ? text : null;
}

/** Collects into `errors` what the extension throws or logs as an error on `page`. */
export function watchExtensionErrors(page: Page, errors: ExtensionError[]): void {
  page.on('pageerror', error => {
    const text = error.stack ?? `${error.name}: ${error.message}`;
    if (isFromExtension(text)) errors.push({ kind: 'exception', page: page.url(), text });
  });
  page.on('console', message => {
    const text = consoleError(message);
    if (text !== null) errors.push({ kind: 'console', page: page.url(), text });
  });
}
