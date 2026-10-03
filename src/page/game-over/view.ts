import { closestTo, createElement, queryOne, setData } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { badgesMarkup, kingBadges } from './badges.ts';
import { kingCells } from './board.ts';
import { actionsMarkup, cardMarkup } from './card.ts';
import { CHIP_STAGGER_MS, createChips, type Chips } from './chips.ts';
import { CONFETTI_COUNT, confettiEndMs, confettiMarkup, confettiPieces } from './confetti.ts';
import { isFollowUpAction, pressFollowUp, readFollowUp } from './follow-up.ts';
import type { Outcome } from './outcome.ts';
import type { PlayerSummary } from './quick-review.ts';
import { formatAccuracy, type GameOverTexts } from './texts.ts';
import { createVoice, type Voice } from './voice.ts';

// The game over on the board (styles/game/game-end.css): the kings' badges,
// the winner's confetti and the card, in one layer over the board that lets
// clicks through but on the card. The badges show large for a moment, then
// shrink to pips on the kings' corners as the card comes in. They follow the
// kings as the player steps through the moves or flips the board.

const SYNC_MS = 250;
/** How long the large badges show before the card comes. */
export const SETTLE_MS = 1500;
/** The counts spin at least this long, even when the moves were counted at once. */
export const MIN_SPIN_MS = 1200;

export interface GameOverInput {
  readonly main: HTMLElement;
  readonly outcome: Outcome;
  readonly texts: GameOverTexts;
  readonly coachId: number;
  readonly opponent: string;
  readonly reviewHref: string;
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
  readonly counts: HTMLElement | null;
  /** The ticket's stub: the accuracy over the counts. */
  readonly stub: HTMLElement | null;
  readonly accuracy: HTMLElement | null;
  readonly actions: HTMLElement | null;
  readonly voice: Voice | null;
  readonly chips: Chips | null;
}

function buildLayer(input: GameOverInput): Layer {
  const root = createElement('div', { className: 'cdc-end' });
  const kings = createElement('div', { className: 'cdc-end__kings' });
  root.append(kings);
  if (input.outcome.result === 'win') addConfetti(root);
  root.insertAdjacentHTML('beforeend', cardMarkup(input).value);
  const card = queryOne(root, '.cdc-end__card', HTMLElement);
  const part = (name: string): HTMLElement | null =>
    card ? queryOne(card, `.cdc-end__${name}`, HTMLElement) : null;
  const [bubble, counts] = [part('bubble'), part('counts')];
  return {
    root,
    kings,
    card,
    counts,
    stub: part('stub'),
    accuracy: card ? queryOne(card, '.cdc-end__accuracy b', HTMLElement) : null,
    actions: part('actions'),
    voice: bubble ? createVoice(bubble, input.coachId) : null,
    chips: counts ? createChips(counts) : null,
  };
}

/** Redraws the badges and the buttons when the kings or Lichess's buttons change. */
function followBoard(layer: Layer, input: GameOverInput): void {
  const badges = kingBadges(input.outcome, input.texts);
  let kingsKey = '';
  let actionsKey = '';
  const sync = (): void => {
    const cells = kingCells(input.main);
    const key = JSON.stringify(cells);
    if (key !== kingsKey) setHtml(layer.kings, badgesMarkup(badges, cells));
    kingsKey = key;
    const followUp = readFollowUp(input.reviewHref);
    const next = JSON.stringify(followUp);
    if (layer.actions && next !== actionsKey)
      setHtml(layer.actions, actionsMarkup(followUp, input.texts));
    actionsKey = next;
  };
  sync();
  const timer = setInterval(() => {
    if (layer.root.isConnected) sync();
    else clearInterval(timer);
  }, SYNC_MS);
}

function listen(layer: Layer): void {
  layer.root.addEventListener('click', event => {
    if (closestTo(event.target, '.cdc-end__close', HTMLElement)) {
      layer.chips?.stop();
      layer.card?.remove();
    }
    const action = closestTo(event.target, '[data-cdc-end]', HTMLElement)?.dataset.cdcEnd;
    if (isFollowUpAction(action)) pressFollowUp(action);
  });
}

/** The figures a card shows: two summaries that read the same change nothing. */
const shownAs = (summary: PlayerSummary): string =>
  JSON.stringify([
    summary.accuracy === null ? null : formatAccuracy(summary.accuracy),
    summary.counts,
  ]);

function showAccuracy(element: HTMLElement | null, summary: PlayerSummary): void {
  if (element)
    element.textContent = summary.accuracy === null ? '–' : formatAccuracy(summary.accuracy);
}

/** What the card shows and the coach says, once the card has come in. */
function cardView(layer: Layer, input: GameOverInput, settled: Promise<void>): GameOverView {
  const { card, stub, accuracy: accuracyNumber, voice, chips } = layer;
  const { outcome, texts } = input;
  const later = (show: () => void): void => {
    void settled.finally(() => {
      if (card?.isConnected) show();
    });
  };
  const mood = outcome.result === 'win' ? 'happy' : 'neutral';
  const words = (summary: PlayerSummary | null): string => {
    const accuracy = summary?.accuracy ?? null;
    return texts.verdict(outcome.result, accuracy === null ? null : formatAccuracy(accuracy));
  };
  let spunAt: number | null = null;
  let shown: PlayerSummary | null = null;
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
          showAccuracy(accuracyNumber, summary);
        } else stub?.remove();
        // The counts come in first, then the coach speaks.
        voice?.typeOut(words(summary), mood, summary ? CHIP_STAGGER_MS * 3 : 0);
      }),
    refine: summary =>
      afterSpin(() => {
        if (!shown || shownAs(shown) === shownAs(summary)) return;
        shown = summary;
        chips?.update(summary, texts);
        showAccuracy(accuracyNumber, summary);
        voice?.say(words(summary), mood);
      }),
    failed: () =>
      afterSpin(() => {
        chips?.stop();
        stub?.remove();
        voice?.say(texts.failed, 'neutral');
      }),
  };
}

export function mountGameOver(input: GameOverInput): GameOverView {
  const layer = buildLayer(input);
  setData(input.main, 'cdcEnd', '');
  input.main.append(layer.root);
  followBoard(layer, input);
  listen(layer);
  // What the card shows waits for it to come in.
  const settled = new Promise<void>(resolve => {
    setTimeout(() => {
      layer.root.classList.toggle('cdc-end--settled', true);
      resolve();
    }, SETTLE_MS);
  });
  return cardView(layer, input, settled);
}
