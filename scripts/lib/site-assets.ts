// What the promotional site's page, sheets and scripts name, and where each
// file comes from: the store's shots and mascots, the board reliefs, Boxwood's
// takes and the icon stay where they are in the repository, and only those the
// site names are copied.

/** A folder of the site, and the repository's folder its pictures come from. */
const FOLDERS: Readonly<Record<string, string>> = {
  shots: 'store/templates/shots',
  coaches: 'store/templates/coaches',
  'img/boards': 'public/img/boards',
  'sounds/boxwood': 'public/sounds/boxwood',
};

/** Single files, by their path in the site. */
const FILES: Readonly<Record<string, string>> = {
  'img/icon.png': 'public/icons/icon128.png',
  // The store's marquee tile, the picture a shared link shows.
  'img/social.png': 'store/en/promo-marquee.png',
};

/** Each asset a text of the site names, as its path in the site and in the repository. */
export function namedAssets(text: string): Map<string, string> {
  const assets = new Map<string, string>();
  for (const [folder, source] of Object.entries(FOLDERS)) {
    const named = new RegExp(String.raw`(?<![\w/])${folder}/([a-z0-9-]+\.(?:webp|ogg))`, 'g');
    for (const [, file] of text.matchAll(named))
      if (file) assets.set(`${folder}/${file}`, `${source}/${file}`);
  }
  for (const [name, source] of Object.entries(FILES))
    if (text.includes(name)) assets.set(name, source);
  return assets;
}
