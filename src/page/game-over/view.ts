import { createElement, queryOne, setData, setStyleProperty } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { badgesMarkup, kingBadges } from './badges.ts';
import { kingCells } from './board.ts';
import { cardMarkup, endCardInput, RESULT_MOODS } from './card.ts';
import { CHIP_STAGGER_MS, createChips, type Chips } from './chips.ts';
import { CONFETTI_COUNT, confettiEndMs, confettiMarkup, confettiPieces } from './confetti.ts';
import { countUp } from './count-up.ts';
import type { Outcome } from './outcome.ts';
import type { PlayerSummary } from './quick-review.ts';
import { accuracyDecimals, formatAccuracy, type GameOverTexts } from './texts.ts';
import { createVoice, type Voice } from './voice.ts';

// The game over (styles/game/game-end.css, game-end-card.css): the kings'
// badges and the winner's confetti in a layer over the board that lets clicks
// through, and the card at the head of Lichess's follow-up buttons. The badges
// show large for a moment, then shrink to pips on the kings' corners as the
// coach starts speaking. They follow the kings as the player steps through the
// moves or flips the board.

const SYNC_MS = 250;
const FOLLOW_UP = '.rcontrols .follow-up';
/** How long the large badges show before the coach speaks. */
export const SETTLE_MS = 1500;
/** The counts spin at least this long, even when the moves were counted at once. */
export const MIN_SPIN_MS = 1200;

export interface GameOverInput {
  readonly main: HTMLElement;
  readonly outcome: Outcome;
  readonly texts: GameOverTexts;
  readonly coachId: number;
  readonly opponent: string;
  /** Watched as it ended, not opened once over: only then the winner gets confetti. */
  readonly live: boolean;
}

export interface GameOverView {
  readonly analysing: () => void;
  /** The coach's verdict; without a summary, the counts go. */
  readonly verdict: (summary: PlayerSummary | null) => void;
  /** The review's own figures once its analysis is done: the card changes where they differ. */
  readonly refine: (summary: PlayerSummary) => void;
  readonly failed: () => void;
}

function addConfetti(layer: HTMLElement): void {
  const pieces = confettiPieces(CONFETTI_COUNT, Math.random);
  layer.insertAdjacentHTML('beforeend', confettiMarkup(pieces).value);
  const confetti = layer.lastElementChild;
  setTimeout(() => confetti?.remove(), confettiEndMs(pieces));
}

interface Layer {
  readonly root: HTMLElement;
  readonly kings: HTMLElement;
  readonly card: HTMLElement | null;
  /** The accuracy and the counts, which go without figures. */
  readonly stats: HTMLElement | null;
  readonly accuracy: HTMLElement | null;
  readonly voice: Voice | null;
  readonly chips: Chips | null;
}

function buildLayer(input: GameOverInput): Layer {
  const root = createElement('div', { className: 'ln-ext-end' });
  const kings = createElement('div', { className: 'ln-ext-end__kings' });
  root.append(kings);
  if (input.outcome.result === 'win' && input.live) addConfetti(root);
  const holder = createElement('div');
  setHtml(holder, cardMarkup(endCardInput(input)));
  const card = queryOne(holder, '.ln-ext-end__card', HTMLElement);
  const part = (name: string): HTMLElement | null =>
    card ? queryOne(card, `.ln-ext-end__${name}`, HTMLElement) : null;
  const [bubble, counts] = [part('bubble'), part('counts')];
  return {
    root,
    kings,
    card,
    stats: part('stats'),
    accuracy: card ? queryOne(card, '.ln-ext-end__accuracy b', HTMLElement) : null,
    voice: bubble ? createVoice(bubble, input.coachId) : null,
    chips: counts ? createChips(counts) : null,
  };
}

/**
 * Keeps the card at the head of Lichess's follow-up buttons, which Lichess may
 * draw again, and redraws the badges when the kings move.
 */
function followPage(layer: Layer, input: GameOverInput): void {
  const badges = kingBadges(input.outcome, input.texts);
  let kingsKey = '';
  const sync = (): void => {
    const cells = kingCells(input.main);
    const key = JSON.stringify(cells);
    if (key !== kingsKey) setHtml(layer.kings, badgesMarkup(badges, cells));
    kingsKey = key;
    const followUp = queryOne(input.main, FOLLOW_UP, HTMLElement);
    if (!followUp || !layer.card || layer.card.parentElement === followUp) return;
    followUp.prepend(layer.card);
    setData(followUp, 'lnExtEndCard', '');
  };
  sync();
  const timer = setInterval(() => {
    if (layer.root.isConnected) sync();
    else clearInterval(timer);
  }, SYNC_MS);
}

/** The figures a card shows: two summaries that read the same change nothing. */
const shownAs = (summary: PlayerSummary): string =>
  JSON.stringify([
    summary.accuracy === null ? null : formatAccuracy(summary.accuracy),
    summary.counts,
  ]);

/** Counts the accuracy up to `summary`'s, from `from`; returns where it ends. */
function showAccuracy(element: HTMLElement | null, summary: PlayerSummary, from: number): number {
  if (!element) return from;
  if (summary.accuracy === null) {
    element.textContent = '–';
    return 0;
  }
  // As many tenths all along as at the end, and the room the end takes, right-aligned
  // (game-end-stats.css): the digits change, not where the "%" stands.
  const decimals = accuracyDecimals(summary.accuracy);
  const format = (figure: number): string => formatAccuracy(figure, decimals);
  setStyleProperty(element, 'min-width', null);
  const shown = element.textContent;
  element.textContent = format(summary.accuracy);
  setStyleProperty(element, 'min-width', `${element.offsetWidth}px`);
  element.textContent = shown;
  countUp(element, { from, to: summary.accuracy }, format);
  return summary.accuracy;
}

/** What the card shows and the coach says, once the card has come in. */
function cardView(layer: Layer, input: GameOverInput, settled: Promise<void>): GameOverView {
  const { card, stats, accuracy: accuracyNumber, voice, chips } = layer;
  const dropStats = (): void => stats?.remove();
  const { outcome, texts } = input;
  const later = (show: () => void): void => {
    void settled.finally(() => {
      if (card?.isConnected) show();
    });
  };
  const mood = RESULT_MOODS[outcome.result];
  const words = (summary: PlayerSummary | null): string => {
    const accuracy = summary?.accuracy ?? null;
    return texts.verdict(outcome.result, accuracy === null ? null : formatAccuracy(accuracy));
  };
  let spunAt: number | null = null;
  let shown: PlayerSummary | null = null;
  // Where the accuracy's count stands: the review's figure glides on from the quick look's.
  let counted = 0;
  const afterSpin = (show: () => void): void =>
    later(() => {
      const left = spunAt === null ? 0 : spunAt + MIN_SPIN_MS - Date.now();
      if (left <= 0) show();
      else setTimeout(() => card?.isConnected && show(), left);
    });
  return {
    analysing: () =>
      later(() => {
        spunAt = Date.now();
        chips?.spin();
        voice?.say(texts.analysing, 'neutral');
      }),
    verdict: summary =>
      afterSpin(() => {
        shown = summary;
        if (summary) {
          chips?.reveal(summary, texts);
          counted = showAccuracy(accuracyNumber, summary, counted);
        } else dropStats();
        // The counts come in first, then the coach speaks.
        voice?.typeOut(words(summary), mood, summary ? CHIP_STAGGER_MS * 3 : 0);
      }),
    refine: summary =>
      afterSpin(() => {
        if (!shown || shownAs(shown) === shownAs(summary)) return;
        shown = summary;
        chips?.update(summary, texts);
        counted = showAccuracy(accuracyNumber, summary, counted);
        voice?.say(words(summary), mood);
      }),
    failed: () =>
      afterSpin(() => {
        chips?.stop();
        dropStats();
        voice?.say(texts.failed, 'neutral');
      }),
  };
}

export function mountGameOver(input: GameOverInput): GameOverView {
  // A dev preview shows it again: the last one goes, its card too.
  input.main.querySelector(':scope > .ln-ext-end')?.remove();
  input.main.querySelector('.ln-ext-end__card')?.remove();
  const layer = buildLayer(input);
  setData(input.main, 'lnExtEnd', '');
  input.main.append(layer.root);
  followPage(layer, input);
  // What the card shows waits for the badges to settle.
  const settled = new Promise<void>(resolve => {
    setTimeout(() => {
      layer.root.classList.toggle('ln-ext-end--settled', true);
      resolve();
    }, SETTLE_MS);
  });
  return cardView(layer, input, settled);
}
