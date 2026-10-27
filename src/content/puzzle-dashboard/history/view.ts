import { html, type SafeHtml } from '#shared/html.ts';
import { boardMarkup } from '#shared/still-board.ts';
import { message } from '#content/platform/runtime.ts';
import { number } from '#content/puzzle-dashboard/format.ts';
import { mascotMarkup } from '#content/puzzle-dashboard/mascot.ts';
import type { Week, Word } from './coach-word.ts';
import type { Round } from './read.ts';

// Over the history (styles/puzzles/history.css): the player's mascot with the
// week's one number on a track in its color, and what it says of it; then the
// puzzles to retry, each a board and a link to it.

/** Lichess's replay of the week's failed puzzles, all themes. */
export const REPLAY_HREF = '/training/replay/7/mix';
const TRAIN_HREF = '/training';
/** How many boards the shelf holds. */
export const SHELF_SIZE = 12;

const say = (word: Word): string =>
  word.lines.map(({ name, values }) => message(name, ...values)).join(' ');

function acts(week: Week): SafeHtml {
  const keepGoing = message(week.puzzles === 0 ? 'phistStart' : 'phistKeepGoing');
  if (week.toReplay === 0)
    return html`<a class="ln-ext-phist__retry" href="${TRAIN_HREF}">${keepGoing}</a>`;
  const retry =
    week.toReplay === 1
      ? message('phistRetryOne')
      : message('phistRetryMany', number(week.toReplay));
  return html`<a class="ln-ext-phist__retry" href="${REPLAY_HREF}">${retry}</a>
    <a class="ln-ext-phist__go" href="${TRAIN_HREF}">${keepGoing}</a>`;
}

export function heroMarkup(week: Week, word: Word, coachId: number | null): SafeHtml {
  const share = week.puzzles === 0 ? 0 : week.firstWins / week.puzzles;
  return html`<section class="ln-ext-phist__hero" data-ln-ext-tier="${word.tier}">
    ${mascotMarkup(coachId)}
    <div class="ln-ext-phist__week">
      <small>${message('phistKicker')}</small>
      <div class="ln-ext-phist__big">
        <b>${number(week.firstWins)}</b>
        <span>${message('phistSolved', number(week.puzzles))}</span>
      </div>
      <span class="ln-ext-phist__track" style="--ln-ext-phist-p: ${share.toFixed(3)}">
        <i class="ln-ext-phist__fill"></i><i class="ln-ext-phist__knob"></i>
      </span>
      <p>${say(word)}</p>
    </div>
    <div class="ln-ext-phist__acts">${acts(week)}</div>
  </section>`;
}

const redo = (round: Round): SafeHtml | false =>
  round.board !== null &&
  html`<a class="ln-ext-phist__redo" href="${round.href}">
    ${boardMarkup(round.board)}<span class="ln-ext-phist__redo-go">${message('phistRetry')}</span>
  </a>`;

export const shelfMarkup = (rounds: readonly Round[]): SafeHtml =>
  html`<section class="ln-ext-phist__shelf">
    <header><h2>${message('phistToRetry')}</h2><small>${message('phistToRetrySub')}</small></header>
    <div class="ln-ext-phist__redos">${rounds.slice(0, SHELF_SIZE).map(redo)}</div>
  </section>`;

/** A session's score, beside its title: a dot per puzzle, then solved out of played. */
export function scoreMarkup(rounds: readonly Round[], tier: string): SafeHtml {
  const solved = rounds.filter(round => round.solved).length;
  return html`<span class="ln-ext-phist__score" data-ln-ext-tier="${tier}">
    <span class="ln-ext-phist__dots">${rounds.map(round => html`<i ${round.solved && html`data-ln-ext-solved`}></i>`)}</span>
    <b>${solved}/${rounds.length}</b>
  </span>`;
}
