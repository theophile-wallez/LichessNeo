import { createElement } from './dom.ts';

// Saves a file the extension made to the user's downloads.

// Revoked at once, the file may not be read yet: Firefox then saves nothing.
const REVOKE_DELAY = 60_000;

export function saveFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  // Firefox follows a link's download only while it's in the document.
  const link = createElement('a', { attrs: { href: url, download: name } });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY);
}
