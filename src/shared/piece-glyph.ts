import { html, type SafeHtml } from './html.ts';

// A piece in our own markup (captured pieces, the review's comments), drawn
// from the set the board shows: styles/board/pieces.css gives each code
// Lichess's variable for it, which a picked pack overrides.

/** `code` is the color's letter and the role's, as FEN writes it: wp, bn… */
export const pieceGlyph = (code: string): SafeHtml =>
  html`<i class="ln-ext-pc ln-ext-pc-${code}"></i>`;
