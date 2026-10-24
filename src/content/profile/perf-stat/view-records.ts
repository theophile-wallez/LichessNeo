import Alert02Icon from '@hugeicons/core-free-icons/Alert02Icon';
import ArrowDownRight01Icon from '@hugeicons/core-free-icons/ArrowDownRight01Icon';
import ArrowRight01Icon from '@hugeicons/core-free-icons/ArrowRight01Icon';
import FireIcon from '@hugeicons/core-free-icons/FireIcon';
import Medal01Icon from '@hugeicons/core-free-icons/Medal01Icon';
import RepeatIcon from '@hugeicons/core-free-icons/RepeatIcon';
import Timer02Icon from '@hugeicons/core-free-icons/Timer02Icon';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon, type HugeIcon } from '#shared/hugeicons.ts';
import { avatarAttributes } from '#shared/own-avatar.ts';
import { formatDay, formatDays } from './dates.ts';
import type { Opponent, OpponentList, Streak, StreakValue } from './read.ts';
import { tile, type Tone } from './view-figures.ts';

// The streaks, a card each with its record and the streak going on under it, and the
// best wins and worst defeats, a row per game.

const STREAK_LOOKS: Readonly<Record<Streak['kind'], readonly [HugeIcon, Tone]>> = {
  win: [FireIcon, 'orange'],
  loss: [ArrowDownRight01Icon, 'red'],
  play: [RepeatIcon, 'blue'],
  time: [Timer02Icon, 'cyan'],
};

function streakDays(value: StreakValue): SafeHtml {
  const { from, to } = value;
  if (!from) return html``;
  const days = to ? formatDays(from.at, to.at) : formatDay(from.at);
  return html`<a class="glpt" href="${from.href}">${days}</a>`;
}

// A count reads big with its unit beside it; a duration ("3 days, 5 hours") is all value.
function streakFigure(value: StreakValue): SafeHtml {
  return value.count === null
    ? html`<b class="ln-ext-perf__long">${value.rest}</b>`
    : html`<b>${value.count}<small>${value.rest}</small></b>`;
}

function currentLine(current: StreakValue | null): SafeHtml {
  if (!current) return html``;
  const value = current.count ?? (current.rest === '-' ? '–' : current.rest);
  return html`<div class="ln-ext-perf__current"><span>${current.label}</span><b>${value}</b></div>`;
}

function streakCard(streak: Streak): SafeHtml {
  const [icon, tone] = STREAK_LOOKS[streak.kind];
  return html`<section class="ln-ext-perf__card ln-ext-perf__streak">
    <h3 class="ln-ext-perf__head">${tile(icon, tone)}<span${streak.tip ? html` title="${streak.tip}"` : ''}>${streak.title}</span></h3>
    ${streakFigure(streak.longest)}${streakDays(streak.longest)}${currentLine(streak.current)}
  </section>`;
}

function userLink(opponent: Opponent): SafeHtml {
  const title = opponent.title
    ? html`<span class="utitle" title="${opponent.title.tip}">${opponent.title.text}</span>&nbsp;`
    : html``;
  const flair = opponent.flair ? html`<img class="uflair" src="${opponent.flair}">` : html``;
  return html`<a class="user-link ulpt" href="${opponent.href}">${title}${opponent.name}${flair}</a>`;
}

function opponentRow(opponent: Opponent, tone: Tone): SafeHtml {
  const { game } = opponent;
  const rating = html`<span class="ln-ext-perf__pill" data-ln-ext-tone="${tone}">${opponent.rating}</span>`;
  const day = game
    ? html`<a class="ln-ext-perf__day glpt" href="${game.href}">${formatDay(game.at)}</a>`
    : html``;
  const result = game
    ? html`<a class="ln-ext-perf__game glpt" href="${game.href}">${rating}${hugeicon(ArrowRight01Icon)}</a>`
    : rating;
  return html`<div class="ln-ext-perf__opponent"><span class="ln-ext-perf__avatar"${avatarAttributes(opponent.name)}></span><div class="ln-ext-perf__who">${userLink(opponent)}${day}</div>${result}</div>`;
}

function opponentsCard(list: OpponentList): SafeHtml {
  const [icon, tone] =
    list.kind === 'best' ? ([Medal01Icon, 'green'] as const) : ([Alert02Icon, 'red'] as const);
  return html`<section class="ln-ext-perf__card ln-ext-perf__opponents">
    <h3 class="ln-ext-perf__head">${tile(icon, tone)}<span>${list.title}</span></h3>
    ${list.opponents.map(opponent => opponentRow(opponent, tone))}
  </section>`;
}

export const streaksMarkup = (streaks: readonly Streak[]): SafeHtml =>
  html`${streaks.map(streakCard)}`;

export const opponentsMarkup = (lists: readonly OpponentList[]): SafeHtml =>
  html`${lists.filter(list => list.opponents.length > 0).map(opponentsCard)}`;
