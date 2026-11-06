import { html, type SafeHtml } from '#shared/html.ts';
import { pageLocale } from '#shared/lang.ts';
import { boardMarkup } from '#shared/still-board.ts';
import { timeControlText } from '#shared/time-control.ts';
import { timeSince } from '#shared/time-since.ts';
import { message } from '#content/platform/runtime.ts';
import type { Opponent, Outcome, RecentGame } from './games.ts';

// What a recent game shows (styles/profile/recent-games.css): its last position
// from the player's side, the opponent, the outcome and when. The profile lays
// them out as a card, the home as a row.

/** Lichess's glyph for each speed, which its own [data-icon] rules draw. */
export const SPEED_GLYPHS: Readonly<Record<string, string>> = {
  ultraBullet: '\ue059',
  bullet: '\ue032',
  blitz: '\ue008',
  rapid: '\ue002',
  classical: '\ue00a',
  correspondence: '\ue019',
};

const OUTCOMES: Readonly<Record<Outcome, string>> = {
  win: 'recentGamesWin',
  loss: 'recentGamesLoss',
  draw: 'recentGamesDraw',
};

function opponentMarkup({ name, title, rating, aiLevel }: Opponent): SafeHtml {
  let who: string;
  if (name) who = name;
  else if (aiLevel === undefined) who = message('recentGamesAnonymous');
  else who = message('recentGamesStockfish', String(aiLevel));
  return html`<span class="ln-ext-recent__opponent">
    ${title && html`<span class="utitle">${title}</span>`}
    <b class="ln-ext-recent__name">${who}</b>
    ${rating !== undefined && html`<span class="ln-ext-recent__rating">${rating}</span>`}
  </span>`;
}

function paceText({ clock, daysPerTurn }: RecentGame): string | null {
  if (clock) return timeControlText(clock);
  if (daysPerTurn === undefined) return null;
  const days = { style: 'unit', unit: 'day', unitDisplay: 'long' } as const;
  return new Intl.NumberFormat(pageLocale(), days).format(daysPerTurn);
}

const diffText = (diff: number): string =>
  new Intl.NumberFormat(pageLocale(), { signDisplay: 'exceptZero' }).format(diff);

/** The game's board, opponent, outcome and pace, `now` telling how long ago it was. */
export function gamePartsMarkup(game: RecentGame, now: number): SafeHtml {
  const since = timeSince(game.playedAt, now);
  const ago = new Intl.RelativeTimeFormat(pageLocale(), { numeric: 'auto', style: 'short' });
  const pace = paceText(game);
  const diff = game.ratingDiff;
  return html`${boardMarkup(game.board)}
    ${opponentMarkup(game.opponent)}
    <span class="ln-ext-recent__result">
      <span class="ln-ext-recent__outcome">${message(OUTCOMES[game.outcome])}</span>
      ${diff !== undefined && html`<span class="ln-ext-recent__diff">${diffText(diff)}</span>`}
    </span>
    <span class="ln-ext-recent__meta">
      <span class="ln-ext-recent__speed" data-icon="${SPEED_GLYPHS[game.speed] ?? ''}"></span>
      ${pace && html`<span>${pace}</span>`}
      <time class="ln-ext-recent__ago">${ago.format(since.value, since.unit)}</time>
    </span>`;
}
