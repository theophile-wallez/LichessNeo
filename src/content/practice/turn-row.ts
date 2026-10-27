import { createCustomElement, createElement, setData, setText } from '#shared/dom.ts';
import type { Turn } from './turn.ts';

// The drill's turn on the coach's card, under its words
// (styles/practice-run/turn-row.css): the king of the side played, whose turn it
// is, the last move's verdict and its advice, then the hint, which clicks
// Lichess's own link.

export interface TurnRow {
  readonly root: HTMLElement;
  readonly show: (turn: Turn | null) => void;
}

export function buildTurnRow(onHint: () => void): TurnRow {
  const root = createElement('div', { className: 'ln-ext-practice-turn' });
  const tile = createElement('span', {
    className: 'ln-ext-practice-turn__king',
    attrs: { 'aria-hidden': 'true' },
  });
  const king = createCustomElement('piece', { className: 'king white' });
  tile.append(king);
  const status = createElement('strong', { className: 'ln-ext-practice-turn__status' });
  const verdict = createElement('span', { className: 'ln-ext-practice-turn__verdict' });
  const advice = createElement('span', { className: 'ln-ext-practice-turn__advice' });
  const head = createElement('span', { className: 'ln-ext-practice-turn__head' });
  head.append(status, verdict);
  const words = createElement('span', { className: 'ln-ext-practice-turn__words' });
  words.append(head, advice);
  const hint = createElement('button', {
    className: 'ln-ext-practice-turn__hint',
    attrs: { type: 'button' },
  });
  hint.addEventListener('click', onHint);
  root.append(tile, words, hint);

  const show = (turn: Turn | null): void => {
    if (root.hidden !== !turn) root.hidden = !turn;
    if (!turn) return;
    setData(root, 'lnExtColor', turn.color);
    setData(root, 'lnExtQuality', turn.quality);
    if (turn.color && !king.classList.contains(turn.color)) king.className = `king ${turn.color}`;
    setText(status, turn.status);
    setText(verdict, turn.verdict);
    setText(advice, turn.advice);
    setText(hint, turn.hint);
  };
  return { root, show };
}
