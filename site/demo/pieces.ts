// Where a piece set's files are: Lichess's own (cburnett, kept with the site)
// or one of the extension's (public/img/pieces).

export const LICHESS_SET = 'cburnett';

export const pieceUrl = (pieceSet: string, code: string): string =>
  pieceSet === LICHESS_SET
    ? `pieces/${LICHESS_SET}/${code}.svg`
    : `img/pieces/${pieceSet}/${code}.webp`;
