import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { CoachMood } from './coach.ts';
import { createVoice, type Voice, WORD_MS } from './coach-voice.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const shown = (bubble: HTMLElement): string =>
  [...bubble.querySelectorAll('.lr-ext-w--in')].map(word => word.textContent).join('');

type Talk = (mood: CoachMood, talking: boolean) => void;

function voiceIn(bubble: HTMLElement): { readonly talk: Mock<Talk>; readonly voice: Voice } {
  const talk = vi.fn<Talk>();
  return { talk, voice: createVoice(bubble, { talk, emptyClass: 'empty' }) };
}

describe('the coach’s voice', () => {
  it('types the words out where they already hold their place, talking while they come', () => {
    const bubble = document.createElement('p');
    const { talk, voice } = voiceIn(bubble);
    voice.typeOut('Well played, again!', 'happy', 500);
    expect(bubble.textContent).toBe('');
    expect(bubble.classList.contains('empty')).toBe(true);
    expect(talk).toHaveBeenLastCalledWith('happy', false);
    vi.advanceTimersByTime(500);
    expect(bubble.textContent).toBe('Well played, again!');
    expect(bubble.classList.contains('empty')).toBe(false);
    expect(shown(bubble)).toBe('');
    expect(talk).toHaveBeenLastCalledWith('happy', true);
    vi.advanceTimersByTime(WORD_MS * 2);
    expect(shown(bubble)).toBe('Well played, ');
    vi.advanceTimersByTime(WORD_MS);
    expect(shown(bubble)).toBe('Well played, again!');
    expect(talk).toHaveBeenLastCalledWith('happy', false);
  });

  it('says words at once, talking for a moment, and drops what it was typing', () => {
    const bubble = document.createElement('p');
    const { talk, voice } = voiceIn(bubble);
    voice.typeOut('Not this.', 'worry', 100);
    voice.say('One moment…', 'neutral');
    expect(bubble.textContent).toBe('One moment…');
    expect(talk).toHaveBeenLastCalledWith('neutral', true);
    vi.advanceTimersByTime(5000);
    expect(bubble.textContent).toBe('One moment…');
    expect(talk).toHaveBeenLastCalledWith('neutral', false);
    expect(talk).not.toHaveBeenCalledWith('worry', true);
  });
});
