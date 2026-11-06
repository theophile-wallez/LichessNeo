import type { LocalFile } from '#shared/packs/local.ts';

// The user's files shown in the import dialog before they're imported: as
// blob: URLs, which the page's CSP lets images and audio load, revoked once
// the dialog closes.

const TYPES: ReadonlyMap<string, string> = new Map([
  ['svg', 'image/svg+xml'],
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['webp', 'image/webp'],
  ['gif', 'image/gif'],
  ['avif', 'image/avif'],
  ['mp3', 'audio/mpeg'],
  ['ogg', 'audio/ogg'],
  ['oga', 'audio/ogg'],
  ['wav', 'audio/wav'],
]);

/** The type its extension says: an SVG shows only as image/svg+xml. */
const typeOf = (path: string): string =>
  TYPES.get(path.slice(path.lastIndexOf('.') + 1).toLowerCase()) ?? '';

export interface FileUrls {
  readonly url: (file: LocalFile) => Promise<string>;
  readonly revoke: () => void;
}

export function fileUrls(): FileUrls {
  const urls = new Map<LocalFile, Promise<string>>();
  return {
    url: file => {
      const known = urls.get(file);
      if (known) return known;
      const url = file
        .read()
        .then(bytes =>
          URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: typeOf(file.path) })),
        );
      urls.set(file, url);
      return url;
    },
    revoke: () => {
      for (const url of urls.values())
        void url.then(
          known => URL.revokeObjectURL(known),
          () => undefined,
        );
      urls.clear();
    },
  };
}
