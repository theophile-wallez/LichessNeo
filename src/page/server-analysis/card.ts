import { closestTo, createElement, queryOne, setData } from '#shared/dom.ts';
import { html, setHtml } from '#shared/html.ts';
import { pageLocale } from '#shared/lang.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { shownName } from '#shared/own-name.ts';
import type { Analysis, Player } from '#page/lichess/analysis.ts';
import { analysisRequestForm, requestAnalysis } from '#page/lichess/analysis-request.ts';
import { translate } from '#page/lichess/globals.ts';
import { PlyChart } from '#page/charts/game/plot.ts';
import { advantageSpec } from '#page/charts/game/specs.ts';
import {
  type CardWords,
  doneHeadMarkup,
  requestMarkup,
  runningMarkup,
  summaryMarkup,
} from './markup.ts';
import type { ServerAnalysis } from './state.ts';

// The card at the end of the move list (styles/analysis/server-analysis.css):
// its text drawn again only when the state changes, its chart kept and fed the
// scores as they come in, its cursor on the move on the board.

const MOVES = 'main.analyse .analyse__tools > .analyse__moves';
const CHART_HEIGHT = 96;

const words = (): CardWords => ({
  title: translate('computerAnalysis', 'Computer analysis'),
  waiting: translate('waitingForAnalysis', 'Waiting for analysis'),
  accuracy: translate('accuracy', 'Accuracy'),
  acpl: translate('averageCentipawnLoss', 'Average centipawn loss'),
  inaccuracy: translate('inaccuracy', 'Inaccuracy'),
  mistake: translate('mistake', 'Mistake'),
  blunder: translate('blunder', 'Blunder'),
  learn: translate('learnFromYourMistakes', 'Learn from your mistakes'),
});

function playerName(player: Player | undefined): string {
  if (player?.user?.username) return shownName(player.user.username);
  if (player?.name) return player.name;
  return player?.ai ? `Stockfish ${player.ai}` : translate('anonymous', 'Anonymous');
}

// Lichess's own label, in the page's language; its translation key's otherwise.
function requestLabel(): string {
  const label = analysisRequestForm()?.textContent.trim() ?? '';
  return label === ''
    ? translate('requestAComputerAnalysis', 'Request a computer analysis')
    : label;
}

const chartKey = (state: ServerAnalysis): string | null => {
  if (state.kind === 'running') return state.share.toFixed(3);
  return state.kind === 'done' ? 'done' : null;
};

export class Card {
  readonly #percent = new Intl.NumberFormat(pageLocale(), { style: 'percent' });
  readonly #own = createOwnedElement(() => this.#build());
  #analysis: Analysis | null = null;
  #chart: PlyChart | null = null;
  #drawn = '';
  #charted: string | null = null;

  sync(analysis: Analysis, state: ServerAnalysis): void {
    const moves = queryOne(document, MOVES, HTMLElement);
    if (!moves) return;
    this.#analysis = analysis;
    const { element: root, isNew } = this.#own(moves);
    if (isNew) {
      this.#chart = null;
      this.#drawn = '';
      this.#charted = null;
    }
    setData(root, 'lnExtState', state.kind);
    this.#drawText(root, analysis, state);
    this.#drawChart(root, analysis, state);
    this.#chart?.follow(analysis.onMainline ? analysis.node.ply : null);
  }

  #build(): HTMLElement {
    const root = createElement('div', { className: 'ln-ext-sanalysis' });
    setHtml(
      root,
      html`<div class="ln-ext-sanalysis__top"></div><div class="ln-ext-sanalysis__chart"></div><div class="ln-ext-sanalysis__bottom"></div>`,
    );
    root.addEventListener('click', event => this.#click(event));
    return root;
  }

  #drawText(root: HTMLElement, analysis: Analysis, state: ServerAnalysis): void {
    const players = analysis.players();
    const names = { white: playerName(players.white), black: playerName(players.black) };
    const key = JSON.stringify([state, names]);
    if (key === this.#drawn) return;
    this.#drawn = key;
    const top = queryOne(root, '.ln-ext-sanalysis__top', HTMLElement);
    const bottom = queryOne(root, '.ln-ext-sanalysis__bottom', HTMLElement);
    if (!top || !bottom) return;
    const texts = words();
    if (state.kind === 'request') setHtml(top, requestMarkup(requestLabel()));
    else if (state.kind === 'running')
      setHtml(top, runningMarkup(texts, state.share, this.#percent));
    else if (state.kind === 'done') setHtml(top, doneHeadMarkup(texts));
    else setHtml(top, html``);
    const summary = state.kind === 'done' ? state.summary : null;
    setHtml(bottom, summary ? summaryMarkup({ sides: summary, names, words: texts }) : html``);
  }

  #drawChart(root: HTMLElement, analysis: Analysis, state: ServerAnalysis): void {
    const key = chartKey(state);
    if (key === null || key === this.#charted) return;
    const spec = advantageSpec(analysis);
    const slot = queryOne(root, '.ln-ext-sanalysis__chart', HTMLElement);
    if (!spec || !slot) return;
    this.#charted = key;
    this.#chart ??= new PlyChart(slot, ply => analysis.jumpToMain(ply), CHART_HEIGHT);
    this.#chart.show(spec);
  }

  #click(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    const button = target && closestTo(target, '[data-ln-ext-server]', HTMLElement);
    const action = button?.dataset.lnExtServer;
    if (action === 'request') requestAnalysis();
    else if (action === 'learn' && this.#analysis) {
      this.#analysis.setRetro(true);
      this.#analysis.redraw();
    }
  }
}
