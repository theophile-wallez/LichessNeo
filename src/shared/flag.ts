// Lichess's images of a profile's flag, the ones its own pages show. An emoji
// flag won't do: Windows' emoji font has none, so Chrome there shows the two
// letters instead.

// Lichess's flag codes: ISO country codes, regions (`GB-SCT`, `PT-20`) and
// its own `_`-prefixed ones (`_earth`).
const FLAG_CODE = /^(?:[A-Z]{2}(?:-[A-Z\d]+)?|_[a-z-]+)$/;

/** The URL of the image of a flag code, as Lichess's asset URLs read; none for anything else. */
export function flagImageUrl(code: string | undefined): string | undefined {
  if (code === undefined || !FLAG_CODE.test(code)) return undefined;
  const { assetUrl = '', assetVersion } = document.body.dataset;
  const version = assetVersion === undefined ? '' : `_${assetVersion}/`;
  return `${assetUrl}/assets/${version}flags/${code}.webp`;
}
