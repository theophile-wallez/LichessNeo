import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createVoice } from './voice.ts';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the coach’s voice', () => {
  it('types the words out, talking while they come', () => {
    const posted = vi.spyOn(window, 'postMessage');
    const bubble = document.createElement('p');
    const voice = createVoice(bubble, 4);
    voice.say('One moment…', 'neutral');
    voice.typeOut('Well played!', 'happy', 500);
    expect(bubble.textContent).toBe('');
    expect(bubble.classList.contains('lr-ext-end__bubble--empty')).toBe(true);
    vi.advanceTimersByTime(500 + 26 * 4);
    expect(bubble.textContent).toBe('Well');
    expect(posted.mock.calls.at(-1)?.[0]).toMatchObject({ coach: 4, mood: 'happy', talking: true });
    vi.advanceTimersByTime(26 * 20);
    expect(bubble.textContent).toBe('Well played!');
    expect(bubble.classList.contains('lr-ext-end__bubble--empty')).toBe(false);
    expect(posted.mock.calls.at(-1)?.[0]).toMatchObject({ mood: 'happy', talking: false });
  });
});
