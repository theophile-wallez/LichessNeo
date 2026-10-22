import { html, type SafeHtml } from '#shared/html.ts';
import { pieceGlyph } from '#shared/piece-glyph.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';

// The coach's comment as markup, typed out word by word like a chat reply.
// Every word is laid out from the start, hidden until its turn, so the
// bubble has its final size at once. The UI owns the typing's timer; this
// only draws a given moment of it.

/**
 * A sentence of the comment. A droppable one is left out when the bubble lacks
 * room; a detail, the technical side of the rest, goes below it.
 */
export interface CommentPart {
  readonly text: string;
  readonly droppable: boolean;
  readonly detail?: boolean;
}

export interface StreamState {
  /** Which comment is being typed (see `commentKey`). */
  readonly key: string;
  /** Words shown so far; Infinity for all of them. */
  readonly shown: number;
  /** The droppable sentences, from the first, that didn't fit: every redraw of this comment leaves them out. */
  readonly dropped: number;
}

export const commentKey = (parts: readonly CommentPart[]): string =>
  parts.map(part => part.text).join('|');

/** The stream for `parts`: the same one, or a fresh one for a new comment. */
export function streamFor(stream: StreamState, parts: readonly CommentPart[]): StreamState {
  const key = commentKey(parts);
  return key === stream.key ? stream : { key, shown: 0, dropped: 0 };
}

/** The words `part` is typed out in, each with the space after it. */
const wordsOf = (part: CommentPart, language: ReviewLanguage): string[] =>
  language.typography(part.text).match(/\S+\s*/g) ?? [];

/** How many words `parts` are typed out in. */
export const wordCount = (parts: readonly CommentPart[], language: ReviewLanguage): number =>
  parts.reduce((count, part) => count + wordsOf(part, language).length, 0);

/**
 * The stream for `parts`, when they may go on from the ones being typed: what
 * was already said stays said, and only the new sentences are typed (a hint
 * added under the coach's line). Any other comment starts over.
 */
export function streamOn(
  stream: StreamState,
  parts: readonly CommentPart[],
  language: ReviewLanguage,
): StreamState {
  const key = commentKey(parts);
  if (key === stream.key) return stream;
  const said = parts.findIndex((_, i) => commentKey(parts.slice(0, i + 1)) === stream.key);
  const shown =
    said < 0 ? 0 : Math.min(stream.shown, wordCount(parts.slice(0, said + 1), language));
  return { key, shown, dropped: 0 };
}

const TOKEN = /\[\[(\w):(.+?)\]\]/g;
const PIECE_LETTER = /^[KQRBN]/;

export interface CommentOptions {
  readonly stream: StreamState;
  readonly language: ReviewLanguage;
}

function movedRole(san: string): string {
  if (san.startsWith('O-O')) return 'k';
  return PIECE_LETTER.test(san) ? san.charAt(0).toLowerCase() : 'p';
}

// A move (`w:Nf3`): the piece that moves, then the notation, a promotion's piece drawn too.
// One that can be played (tokens.ts) is a button: pointing at it draws its
// arrow, clicking plays it (view/chips.ts).
export function moveChip(token: string): SafeHtml {
  const [value = '', play] = token.split('@');
  const color = value.charAt(0);
  const san = value.slice(2).replace(PIECE_LETTER, '');
  const promotion = /=([QRBN])/.exec(san);
  const text =
    promotion === null
      ? html`${san}`
      : html`${san.slice(0, promotion.index)}=${pieceGlyph(color + (promotion[1] ?? '').toLowerCase())}${san.slice(promotion.index + promotion[0].length)}`;
  const chip = html`${pieceGlyph(color + movedRole(value.slice(2)))}${text}`;
  if (play === undefined) return html`<span class="ln-ext-mv">${chip}</span>`;
  const [base = '', ucis = ''] = play.split(':');
  return html`<button class="ln-ext-mv ln-ext-mv--play" data-ln-ext="chip" data-ln-ext-base="${base}" data-ln-ext-ucis="${ucis}">${chip}</button>`;
}

function tokenMarkup(kind: string, value: string): SafeHtml {
  if (kind === 'p') return pieceGlyph(value);
  if (kind === 's') return html`<b class="ln-ext-sq">${value}</b>`;
  if (kind === 'o') {
    const [piece = '', square = ''] = value.split(':');
    return html`<span class="ln-ext-on">${pieceGlyph(piece)}<b class="ln-ext-sq">${square}</b></span>`;
  }
  if (kind === 'n') {
    // A line's numbered move: the number never ends a line without its move.
    const [number = '', move = ''] = value.split(/:(.*)/);
    return html`<span class="ln-ext-num">${number} ${moveChip(move)}</span>`;
  }
  return moveChip(value);
}

/** A word, its tokens drawn. */
function wordMarkup(word: string): SafeHtml {
  const pieces: SafeHtml[] = [];
  let from = 0;
  for (const match of word.matchAll(TOKEN)) {
    pieces.push(
      html`${word.slice(from, match.index)}`,
      tokenMarkup(match[1] ?? '', match[2] ?? ''),
    );
    from = match.index + match[0].length;
  }
  return html`${pieces}${word.slice(from)}`;
}

export function commentMarkup(parts: readonly CommentPart[], options: CommentOptions): SafeHtml {
  const { stream, language } = options;
  let index = 0;
  const droppable = parts.filter(part => part.droppable);
  const left = new Set(droppable.slice(0, stream.dropped));
  const sentences = parts
    .filter(part => !left.has(part))
    .map(part => {
      const spans = wordsOf(part, language).map(word => {
        const hidden = index++ >= stream.shown;
        return html`<span class="ln-ext-w${hidden ? ' ln-ext-w--off' : ''}">${wordMarkup(word)}</span>`;
      });
      const kind = `${part.droppable ? ' ln-ext-say--drop' : ''}${part.detail ? ' ln-ext-say--detail' : ''}`;
      return html`<span class="ln-ext-say${kind}">${spans} </span>`;
    });
  return html`${sentences}`;
}
