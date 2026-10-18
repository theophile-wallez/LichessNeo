import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WORD_MS } from '#shared/coach-voice.ts';
import { createVoice } from './voice.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the card’s voice', () => {
  it('plays the card’s coach through the content script while it types', () => {
    const posted = vi.spyOn(window, 'postMessage');
    const bubble = document.createElement('p');
    const voice = createVoice(bubble, 4);
    voice.typeOut('Well played!', 'happy', 500);
    expect(bubble.classList.contains('ln-ext-end__bubble--empty')).toBe(true);
    vi.advanceTimersByTime(500);
    expect(bubble.classList.contains('ln-ext-end__bubble--empty')).toBe(false);
    expect(posted.mock.calls.at(-1)?.[0]).toMatchObject({ coach: 4, mood: 'happy', talking: true });
    vi.advanceTimersByTime(WORD_MS * 2);
    expect(posted.mock.calls.at(-1)?.[0]).toMatchObject({
      coach: 4,
      mood: 'happy',
      talking: false,
    });
  });
});
