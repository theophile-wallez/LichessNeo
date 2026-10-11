import { html, setHtml, type SafeHtml } from '#shared/html.ts';

// The puzzle history as Lichess serves it (/training/history), cut to what we
// read: sessions in an infinite scroll, a mini board per round.

export const BOARD_STATE = '6k1/8/8/8/8/8/4P3/4K3 w - - 0 1,white,e1e2';

export interface LichessRound {
  readonly id: string;
  readonly solved: boolean;
  /** The mini board's `data-state`, `BOARD_STATE` if left out. */
  readonly state?: string;
}

const round = ({ id, solved, state = BOARD_STATE }: LichessRound): SafeHtml =>
  html`<a class="puzzle-history__round ${solved ? 'good' : 'bad'}" href="/training/${id}">
    <span class="puzzle-history__round__puzzle mini-board cg-wrap is2d" data-state="${state}"></span>
    <span class="puzzle-history__round__meta">
      <span class="puzzle-history__round__result">${solved ? 'solved' : 'incorrect'}</span>
      <span class="puzzle-history__round__id">#${id}</span>
    </span>
  </a>`;

export const lichessSession = (at: Date, rounds: readonly LichessRound[]): SafeHtml =>
  html`<div class="puzzle-history__session">
    <h2 class="puzzle-history__session__title">
      <strong>Healthy mix</strong><time class="timeago" datetime="${at.toISOString()}">1 hour ago</time>
    </h2>
    <div class="puzzle-history__session__rounds">${rounds.map(round)}</div>
  </div>`;

/** The page's box, its sessions in the body. */
export function historyPage(...sessions: SafeHtml[]): HTMLElement {
  setHtml(
    document.body,
    html`<main class="page-menu"><div class="page-menu__content box">
      <h1 class="box__top">Puzzle history</h1>
      <div class="puzzle-history"><div class="infinite-scroll">${sessions}</div></div>
    </div></main>`,
  );
  const box = document.querySelector('.page-menu__content');
  if (!(box instanceof HTMLElement)) throw new Error('no box');
  return box;
}
