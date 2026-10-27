import { type CoachMood, shownCoach } from '#shared/coach.ts';
import { createVoice } from '#shared/coach-voice.ts';
import { createElement, setData } from '#shared/dom.ts';
import { showCoach } from './index.ts';

// The Game Review's coach card outside the review (styles/coach-card.css): the
// coach standing on the card's bottom edge, its words typed out beside it. A
// Learn stage and a practice drill say their goals in it. Lichess redraws the
// panels it goes in, so each keeps one at the end of its own (ownCoachCard).

const REACT = 'ln-ext-coach__avatar--react';
// The coach starts once the panel has settled.
const TYPE_DELAY_MS = 150;

export interface Saying {
  /** Changes when the coach has something new to say, even in the same words. */
  readonly key: string;
  readonly text: string;
  readonly mood: CoachMood;
}

export interface CoachCard {
  readonly root: HTMLElement;
  /** A line over the words, for the place's own use; hidden while empty. */
  readonly kicker: HTMLElement;
  /** The words' column, for the place's own additions under them. */
  readonly bubble: HTMLElement;
  /** Types out what the coach has to say, once per key. */
  readonly say: (saying: Saying) => void;
}

function react(avatar: HTMLElement): void {
  avatar.classList.toggle(REACT, false);
  // Reading the layout restarts the marks' animation.
  void avatar.offsetWidth;
  avatar.classList.toggle(REACT, true);
}

function buildCoachCard(className: string): CoachCard {
  const root = createElement('div', { className: `ln-ext-coach-card ${className}` });
  const avatar = createElement('span', {
    className: 'ln-ext-coach__avatar',
    attrs: { 'aria-hidden': 'true' },
  });
  avatar.append(createElement('span', { className: 'ln-ext-coach__face' }));
  const kicker = createElement('p', { className: 'ln-ext-coach-card__kicker' });
  const words = createElement('p', { className: 'ln-ext-bubble__title' });
  const bubble = createElement('div', { className: 'ln-ext-bubble' });
  bubble.append(kicker, words);
  root.append(avatar, bubble);
  const coach = shownCoach();
  setData(avatar, 'lnExtCoachId', coach === null ? null : String(coach));
  setData(avatar, 'lnExtMood', 'neutral');
  const talk = (mood: CoachMood, talking: boolean): void => {
    setData(avatar, 'lnExtMood', mood);
    if (coach !== null) showCoach({ coach, mood, talking });
  };
  const voice = createVoice(words, { talk, emptyClass: 'ln-ext-bubble__title--empty' });
  let said = '';
  const say = ({ key, text, mood }: Saying): void => {
    if (key === said) return;
    said = key;
    // For the place's stylesheet: the words may take the verdict's color.
    setData(root, 'lnExtMood', mood);
    voice.typeOut(text, mood, TYPE_DELAY_MS);
    if (mood !== 'neutral') react(avatar);
  };
  return { root, kicker, bubble, say };
}

/** Keeps one card at the end of a panel, built again when Lichess replaces the panel. */
export function ownCoachCard(className: string): (panel: Element) => CoachCard {
  let current: CoachCard | null = null;
  return panel => {
    if (current?.root.parentNode === panel) return current;
    current?.root.remove();
    current = buildCoachCard(className);
    panel.append(current.root);
    return current;
  };
}
