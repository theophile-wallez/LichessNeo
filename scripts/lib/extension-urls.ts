// The stylesheet names bundled images by their extension URL. One that is
// missing from the build, or from web_accessible_resources, just doesn't
// show: the build fails on it instead.

const EXTENSION_URL = /chrome-extension:\/\/__MSG_@@extension_id__\/([^'")\s]+)/g;

/** The files the CSS names by extension URL, once each and sorted. */
export function extensionFiles(css: string): string[] {
  const files = new Set(Array.from(css.matchAll(EXTENSION_URL), match => match[1] ?? ''));
  return [...files].toSorted();
}

/** Whether a manifest's `web_accessible_resources` pattern lets the page load the file. */
export function isWebAccessible(file: string, resources: readonly string[]): boolean {
  return resources.some(resource =>
    resource.endsWith('*') ? file.startsWith(resource.slice(0, -1)) : file === resource,
  );
}

interface BuildFiles {
  readonly exists: (file: string) => boolean;
  readonly resources: readonly string[];
}

/** Throws if the CSS names a file the build lacks or the page may not load. */
export function assertExtensionUrls(css: string, { exists, resources }: BuildFiles): void {
  const broken = extensionFiles(css).filter(
    file => !exists(file) || !isWebAccessible(file, resources),
  );
  if (broken.length > 0) {
    throw new Error(`the CSS names files missing or not web-accessible: ${broken.join(', ')}`);
  }
}
