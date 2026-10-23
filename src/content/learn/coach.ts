import { type CoachMood, shownCoach } from '#shared/coach.ts';
import { createVoice, type Voice } from '#shared/coach-voice.ts';
import { createElement, queryOne, setData } from '#shared/dom.ts';
import type { Feature } from '#shared/features.ts';
import { createOwnedElement } from '#shared/owned-element.ts';
import { showCoach } from '#content/coach/index.ts';
import { onEveryTick } from '#content/sync-loop.ts';
import { readSaying } from './saying.ts';

// A Learn stage's coach (styles/learn/coach.css): on the panel right of the
// board, between the stage's title and its levels, it says the level's goal
// in the Game Review's coach card, then cheers or comforts as the level ends.
// Lichess redraws the panel, so the coach is ours, at its end, laid out in
// its place by the stylesheet.

const REACT = 'ln-ext-coach__avatar--react';
// The coach starts once the panel has settled.
const TYPE_DELAY_MS = 150;

interface LearnCoach {
  readonly root: HTMLElement;
  readonly avatar: HTMLElement;
  readonly voice: Voice;
  said: string;
}

function build(): LearnCoach {
  const root = createElement('div', { className: 'ln-ext-learn-coach' });
  const avatar = createElement('span', {
    className: 'ln-ext-coach__avatar',
    attrs: { 'aria-hidden': 'true' },
  });
  avatar.append(createElement('span', { className: 'ln-ext-coach__face' }));
  const words = createElement('p', { className: 'ln-ext-bubble__title' });
  const bubble = createElement('div', { className: 'ln-ext-bubble' });
  bubble.append(words);
  root.append(avatar, bubble);
  const coach = shownCoach();
  setData(avatar, 'lnExtCoachId', coach === null ? null : String(coach));
  setData(avatar, 'lnExtMood', 'neutral');
  const talk = (mood: CoachMood, talking: boolean): void => {
    setData(avatar, 'lnExtMood', mood);
    if (coach !== null) showCoach({ coach, mood, talking });
  };
  const voice = createVoice(words, { talk, emptyClass: 'ln-ext-bubble__title--empty' });
  return { root, avatar, voice, said: '' };
}

// The coach's parts, kept with its root.
const coaches = new WeakMap<HTMLElement, LearnCoach>();
const ownRoot = createOwnedElement(() => {
  const coach = build();
  coaches.set(coach.root, coach);
  return coach.root;
});

function react(avatar: HTMLElement): void {
  avatar.classList.toggle(REACT, false);
  // Reading the layout restarts the marks' animation.
  void avatar.offsetWidth;
  avatar.classList.toggle(REACT, true);
}

function sync(): void {
  const table = queryOne(document, '.learn--run .learn__table', HTMLElement);
  const saying = table && readSaying(table);
  if (!table || !saying) return;
  const coach = coaches.get(ownRoot(table).element);
  if (!coach || coach.said === saying.key) return;
  coach.said = saying.key;
  setData(table, 'lnExtLearnCoach', '');
  coach.voice.typeOut(saying.text, saying.mood, TYPE_DELAY_MS);
  if (saying.mood !== 'neutral') react(coach.avatar);
}

export const learnCoach: Feature = {
  name: 'learn coach',
  start: () => onEveryTick('learn coach', sync),
};
