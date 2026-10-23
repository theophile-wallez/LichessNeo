import { html, type SafeHtml } from '#shared/html.ts';
import { pickBy } from '#page/review/coach/said.ts';
import { bestOf } from '#page/review/practice/progress.ts';
import type { Round } from '#page/review/practice/rounds.ts';
import type { Session } from '#page/review/session.ts';
import { navButton } from './practice-card.ts';
import { svgIcon } from './markup.ts';

// A round's strip over the coach: how far it has got, or the challenge's
// clock and score, the clock counting down in CSS alone
// (styles/review/practice-modes.css). Once over, its sum: the coach's title,
// its words and the buttons on.

/** The strip over the card of a round still going. */
export function roundStrip(round: Round): SafeHtml {
  if (round.kind === 'blitz') {
    const left = Math.max(round.endsAt - Date.now(), 0);
    const seconds = Math.ceil(left / 1000);
    return html`<div class="ln-ext-round ln-ext-round--blitz">
        <span class="ln-ext-round__clock" style="--ln-ext-left:${seconds};--ln-ext-left-ms:${left}ms">${svgIcon('blitz')}<b></b></span>
        <span class="ln-ext-round__score">${svgIcon('tick')}${round.clean}</span>
      </div>`;
  }
  const total = round.cards.length;
  const shown = Math.min(round.index + 1, total);
  return html`<div class="ln-ext-round" style="--ln-ext-round-done:${round.played / Math.max(total, 1)}">
      <span class="ln-ext-round__bar"></span><span class="ln-ext-round__count">${shown}/${total}</span>
    </div>`;
}

/** The round's sum, once over: its title, its words, its buttons. */
export function roundSum(
  session: Session,
  round: Round,
): { title: string; words: string[]; buttons: SafeHtml[] } {
  const { modes } = session.language.ui.practice;
  const done = navButton('practice-stop', 'tick', modes.finish, round.kind !== 'blitz');
  const total = round.played;
  if (round.kind === 'blitz') {
    const record = round.record
      ? pickBy(modes.newRecord, String(round.endsAt))
      : modes.bestWas(bestOf('blitz'));
    const words =
      total === 0
        ? [pickBy(modes.blitzNone, String(round.endsAt))]
        : [modes.blitzScore(round.clean, total), record];
    const again = navButton('practice-mode-blitz', 'retry', modes.playAgain, true);
    return { title: modes.timeUp, words, buttons: [again, done] };
  }
  if (round.kind === 'review')
    return {
      title: modes.reviewDone,
      words: [modes.reviewSummary(round.clean, total)],
      buttons: [done],
    };
  if (round.kind === 'trap') {
    const words = [modes.trapsSummary(round.clean, total)];
    return { title: pickBy(modes.trapDone, 'traps'), words, buttons: [done] };
  }
  return {
    title: pickBy(modes.gamesDone, 'games'),
    words: [modes.reviewSummary(round.clean, total)],
    buttons: [done],
  };
}
