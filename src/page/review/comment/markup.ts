import { html, type SafeHtml } from '#shared/html.ts';
import { pieceGlyph } from '#shared/piece-glyph.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';

// The coach's comment as markup, typed out word by word like a chat reply.
// Every word is laid out from the start, hidden until its turn, so the
// bubble has its final size at once. The UI owns the typing's timer; this
// only draws a given moment of it.

/** A sentence of the comment. A droppable one is left out when the bubble lacks room. */
export interface CommentPart {
  readonly text: string;
  readonly droppable: boolean;
}

export interface StreamState {
  /** Which comment is being typed (see `commentKey`). */
  readonly key: string;
  /** Words shown so far; Infinity for all of them. */
  readonly shown: number;
  /** The droppable sentence didn't fit, so every redraw of this comment leaves it out. */
  readonly dropped: boolean;
}

export const commentKey = (parts: readonly CommentPart[]): string =>
  parts.map(part => part.text).join('|');

/** The stream for `parts`: the same one, or a fresh one for a new comment. */
export function streamFor(stream: StreamState, parts: readonly CommentPart[]): StreamState {
  const key = commentKey(parts);
  return key === stream.key ? stream : { key, shown: 0, dropped: false };
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
  if (play === undefined) return html`<span class="cdc-mv">${chip}</span>`;
  const [base = '', ucis = ''] = play.split(':');
  return html`<button class="cdc-mv cdc-mv--play" data-cdc="chip" data-cdc-base="${base}" data-cdc-ucis="${ucis}">${chip}</button>`;
}

function tokenMarkup(kind: string, value: string): SafeHtml {
  if (kind === 'p') return pieceGlyph(value);
  if (kind === 's') return html`<b class="cdc-sq">${value}</b>`;
  if (kind === 'n') {
    // A line's numbered move: the number never ends a line without its move.
    const [number = '', move = ''] = value.split(/:(.*)/);
    return html`<span class="cdc-num">${number} ${moveChip(move)}</span>`;
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
  const sentences = parts
    .filter(part => !(part.droppable && stream.dropped))
    .map(part => {
      const words = language.typography(part.text).match(/\S+\s*/g) ?? [];
      const spans = words.map(word => {
        const hidden = index++ >= stream.shown;
        return html`<span class="cdc-w${hidden ? ' cdc-w--off' : ''}">${wordMarkup(word)}</span>`;
      });
      return html`<span class="cdc-say${part.droppable ? ' cdc-say--drop' : ''}">${spans} </span>`;
    });
  return html`${sentences}`;
}
