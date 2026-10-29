import type { CoachMood } from '#shared/coach.ts';
import { html, type SafeHtml } from '#shared/html.ts';
import { classMood, type MoveClass } from '#page/review/classes/classes.ts';
import type { ReviewLanguage } from '#page/review/i18n/types.ts';
import type { MoveVerdict } from '#page/review/judge/types.ts';
import { svgIcon } from '#page/review/view/markup.ts';
import { bestCardMarkup, cardMarkup } from './card.ts';
import { bestLine, explainParts, fenAfter, type Line, lineBase } from './explain.ts';
import { introMarkup } from './intro.ts';
import { overMarkup, type Shown, shownOf, underMarkup } from './overlays.ts';
import { retryMarkup, retryMarks, type RetryState } from './retry.ts';
import { commentOn, positions } from './review.ts';

// What the demo shows of the move on the board, whatever its card's buttons
// asked for: the position, what's drawn around the pieces, the coach's card
// and its mood. The coach's comment, Explain's lines (and one played on the
// board), the engine's best move in place of the game's, or a retry.

export type View =
  /** The comment, or Explain's lines; a line of either played on the board. */
  | { readonly kind: 'comment' | 'explain'; readonly line: Line | null }
  | { readonly kind: 'best' }
  | { readonly kind: 'retry'; readonly retry: RetryState };

export const COMMENT: View = { kind: 'comment', line: null };

export interface Scene {
  readonly fen: string;
  readonly under: SafeHtml;
  readonly over: SafeHtml;
  readonly card: SafeHtml;
  /** The card's class, for its look: the verdict's, 'intro', 'retry'. */
  readonly look: string;
  readonly mood: CoachMood;
}

export interface SceneInput {
  readonly ply: number;
  readonly view: View;
  readonly coach: number;
  readonly language: ReviewLanguage;
  /** While retrying, the coach's lines already typed. */
  readonly said: number;
}

const moodOf = (moveClass: MoveClass): CoachMood => classMood(moveClass) ?? 'neutral';

const engineMove = (uci: string, fen: string, moveClass: MoveClass | null): Shown => ({
  uci,
  san: '',
  fen,
  moveClass,
  best: null,
  threat: null,
});

/** The coach's comment, or Explain's lines in its place, with the button that plays them. */
function commentScene(move: MoveVerdict, input: SceneInput, line: Line | null): Scene {
  const { language, view } = input;
  const comment = commentOn(move, input.coach, language);
  const explained =
    view.kind === 'explain'
      ? { parts: explainParts(move, language), themes: [], drawing: [] }
      : comment;
  const best = bestLine(move);
  const label = line
    ? html`${svgIcon('prev')}${language.ui.back}`
    : html`${svgIcon('play')}${language.ui.lines.show}`;
  const actions =
    view.kind === 'explain' && best
      ? html`<div class="ln-ext-bubble__actions"><button type="button" class="ln-ext-bubble__line" data-action="line">${label}</button></div>`
      : html``;
  const card = cardMarkup(move, explained, language, actions);
  const base = { card, look: move.moveClass, mood: moodOf(move.moveClass) };
  if (!line || line.ucis.length === 0)
    return {
      ...base,
      fen: move.position.fen,
      under: underMarkup(shownOf(move), explained.drawing),
      over: overMarkup(shownOf(move)),
    };
  const from = lineBase(move, line);
  const last = line.ucis.at(-1) ?? '';
  const before = fenAfter(from, line.ucis.slice(0, -1));
  return {
    ...base,
    fen: fenAfter(from, line.ucis),
    under: underMarkup(engineMove(last, before, null), []),
    over: html``,
  };
}

function bestScene(move: MoveVerdict, input: SceneInput): Scene {
  const best = move.best ?? '';
  const shown = engineMove(best, move.previousPosition.fen, 'best');
  return {
    fen: fenAfter(move.previousPosition.fen, [best]),
    under: underMarkup(shown, []),
    over: overMarkup(shown),
    card: bestCardMarkup(move, input.language),
    look: 'best',
    mood: moodOf('best'),
  };
}

function retryScene(move: MoveVerdict, retry: RetryState, input: SceneInput): Scene {
  const { outcome } = retry;
  const fen = move.previousPosition.fen;
  const played = outcome.kind === 'waiting' ? null : outcome.uci;
  const done = outcome.kind === 'found' || outcome.kind === 'revealed';
  const shown = played ? engineMove(played, fen, done ? 'best' : null) : null;
  const moods: Record<typeof outcome.kind, CoachMood> = {
    waiting: 'neutral',
    wrong: moodOf('mistake'),
    same: moodOf('mistake'),
    found: moodOf('best'),
    revealed: 'neutral',
  };
  return {
    fen: played ? fenAfter(fen, [played]) : fen,
    under: underMarkup(shown, retryMarks(move, retry), retry.picked),
    over: overMarkup(shown),
    card: retryMarkup(move, retry, input.language, input.said),
    look: 'retry',
    mood: moods[outcome.kind],
  };
}

export function sceneOf(move: MoveVerdict | null, input: SceneInput): Scene {
  const { view } = input;
  if (!move)
    return {
      fen: positions[input.ply]?.fen ?? '',
      under: html``,
      over: html``,
      card: introMarkup(),
      look: 'intro',
      mood: 'happy',
    };
  if (view.kind === 'best') return bestScene(move, input);
  if (view.kind === 'retry') return retryScene(move, view.retry, input);
  return commentScene(move, input, view.line);
}
