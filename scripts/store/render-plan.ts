import path from 'node:path';

// What each store page renders into. A page is drawn at the size its
// <meta name="size"> gives and becomes store/<name>.png, or store/<lang>/<name>.png
// once per language its <meta name="languages"> lists; a page with a
// <meta name="icons"> is the extension's icon instead, drawn once per size it
// lists, with a transparent background.

export interface Shot {
  readonly output: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly deviceScaleFactor: number;
  readonly transparent: boolean;
  /** The language the page shows, given in its URL's hash; null for a page in one. */
  readonly language: string | null;
  /** The image's size in pixels, `128×128`. */
  readonly size: string;
}

export interface RenderDirs {
  readonly store: string;
  readonly icons: string;
}

function readSize(name: string, html: string): { width: number; height: number } {
  const match = /<meta name="size" content="(\d+)x(\d+)">/.exec(html);
  if (match?.[1] === undefined || match[2] === undefined)
    throw new Error(`${name}.html has no <meta name="size" content="<width>x<height>">`);
  return { width: Number(match[1]), height: Number(match[2]) };
}

function readList(html: string, meta: string): string[] | null {
  const list = new RegExp(`<meta name="${meta}" content="([\\w,]+)">`).exec(html)?.[1];
  return list === undefined ? null : list.split(',');
}

export function planShots(name: string, html: string, dirs: RenderDirs): Shot[] {
  const viewport = readSize(name, html);
  const icons = readList(html, 'icons')?.map(Number);
  if (icons)
    return icons.map(width => ({
      output: path.join(dirs.icons, `icon${width}.png`),
      viewport,
      deviceScaleFactor: width / viewport.width,
      transparent: true,
      language: null,
      size: `${width}×${Math.round((viewport.height * width) / viewport.width)}`,
    }));
  const page = (output: string, language: string | null): Shot => ({
    output,
    viewport,
    deviceScaleFactor: 1,
    transparent: false,
    language,
    size: `${viewport.width}×${viewport.height}`,
  });
  const languages = readList(html, 'languages');
  if (!languages) return [page(path.join(dirs.store, `${name}.png`), null)];
  return languages.map(language => page(path.join(dirs.store, language, `${name}.png`), language));
}

/** The pages to render: every one, or those named. */
export function selectTemplates(files: readonly string[], names: readonly string[]): string[] {
  const templates = files.filter(file => file.endsWith('.html')).map(file => file.slice(0, -5));
  const unknown = names.filter(name => !templates.includes(name));
  if (unknown.length > 0) throw new Error(`no such page in store/templates: ${unknown.join(', ')}`);
  return (
    names.length === 0 ? templates : templates.filter(name => names.includes(name))
  ).toSorted();
}
