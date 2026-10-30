// The promotional site's sheets, joined into one at build: the page names
// them one by one, as they are written, and loads one file, minified.

export const JOINED_SHEET = 'css/site.css';

const SHEET_LINK = /\n?[ \t]*<link rel="stylesheet" href="(css\/[\w-]+\.css)" \/>/g;

/** The sheets `page` links to, in its order, and the page linking to the joined one in their place. */
export function joinSheetLinks(page: string): { sheets: string[]; page: string } {
  const sheets = [...page.matchAll(SHEET_LINK)].map(([, sheet]) => sheet ?? '');
  let first = true;
  const joined = page.replace(SHEET_LINK, (link, sheet: string) => {
    if (!first) return '';
    first = false;
    return link.replace(sheet, JOINED_SHEET);
  });
  return { sheets, page: joined };
}
