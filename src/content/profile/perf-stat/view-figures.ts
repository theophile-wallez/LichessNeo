import Award01Icon from '@hugeicons/core-free-icons/Award01Icon';
import ChartColumnIcon from '@hugeicons/core-free-icons/ChartColumnIcon';
import Clock01Icon from '@hugeicons/core-free-icons/Clock01Icon';
import FlashIcon from '@hugeicons/core-free-icons/FlashIcon';
import RankingIcon from '@hugeicons/core-free-icons/RankingIcon';
import { html, type SafeHtml } from '#shared/html.ts';
import { hugeicon, type HugeIcon } from '#shared/hugeicons.ts';
import type { Figure } from './read.ts';

// The counts' two tables: the results in a card, one bar for the wins, draws
// and losses, and the games beside it, a card each.

export type Tone = 'green' | 'red' | 'orange' | 'purple' | 'cyan' | 'blue' | 'dim';

/** A count as a number, whatever the page's digit grouping ("2,328", "2 328"). */
const countOf = (figure: Figure): number => Number(figure.value.replaceAll(/\D/g, '')) || 0;

/** "1826.20" to the unit: an average opponent has no use for hundredths. */
const wholeOf = (value: string): string => value.replace(/[.,]\d+$/, '');

export const tile = (icon: HugeIcon, tone: Tone): SafeHtml =>
  html`<span class="ln-ext-perf__tile" data-ln-ext-tone="${tone}">${hugeicon(icon)}</span>`;

function resultColumn(figure: Figure, tone: Tone): SafeHtml {
  return html`<div class="ln-ext-perf__result" data-ln-ext-tone="${tone}"><span>${figure.label}</span><b>${figure.value}</b><em>${figure.share}</em></div>`;
}

const footFigure = (figure: Figure | undefined, value: (figure: Figure) => string): SafeHtml =>
  figure ? html`<span>${figure.label} <b>${value(figure)}</b></span>` : html``;

interface Results {
  readonly total: Figure | undefined;
  readonly average: Figure | undefined;
  readonly wins: Figure;
  readonly draws: Figure;
  readonly losses: Figure;
  readonly disconnections: Figure | undefined;
}

function resultsCard(results: Results): SafeHtml {
  const { total, wins, draws, losses } = results;
  const bar = [
    [wins, 'green'],
    [draws, 'dim'],
    [losses, 'red'],
  ] as const;
  const games = total ? html`<span>${total.label}</span><b>${total.value}</b>` : html``;
  return html`<section class="ln-ext-perf__card ln-ext-perf__results">
    <h3 class="ln-ext-perf__head">${tile(ChartColumnIcon, 'blue')}${games}</h3>
    <div class="ln-ext-perf__split">${bar.map(([figure, tone]) => html`<i data-ln-ext-tone="${tone}" style="flex-grow:${countOf(figure)}"></i>`)}</div>
    <div class="ln-ext-perf__columns">${bar.map(([figure, tone]) => resultColumn(figure, tone))}</div>
    <div class="ln-ext-perf__foot">${footFigure(results.average, figure => wholeOf(figure.value))}${footFigure(results.disconnections, figure => (figure.share ? `${figure.value} (${figure.share})` : figure.value))}</div>
  </section>`;
}

function gameTile(figure: Figure | undefined, icon: HugeIcon, tone: Tone): SafeHtml {
  if (!figure) return html``;
  const share = figure.share ? html`<small>${figure.share}</small>` : html``;
  return html`<div class="ln-ext-perf__count">${tile(icon, tone)}<div><span>${figure.label}</span><b>${figure.value}${share}</b></div></div>`;
}

/** The results card and the games' cards, from the counts' tables. */
export function figuresMarkup(tables: readonly (readonly Figure[])[]): SafeHtml {
  const [total, rated, tournament, berserk, time] = tables[0] ?? [];
  const [average, wins, draws, losses, disconnections] = tables[1] ?? [];
  const results =
    wins && draws && losses
      ? resultsCard({ total, average, wins, draws, losses, disconnections })
      : html``;
  return html`${results}<div class="ln-ext-perf__counts">
    ${gameTile(rated, RankingIcon, 'purple')}${gameTile(tournament, Award01Icon, 'orange')}${gameTile(berserk, FlashIcon, 'red')}${gameTile(time, Clock01Icon, 'cyan')}
  </div>`;
}
