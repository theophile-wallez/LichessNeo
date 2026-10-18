import { createVoice as createCoachVoice, type Voice } from '#shared/coach-voice.ts';
import { postCoachState } from '#shared/protocol.ts';

// The card's coach speaks in its bubble, its face played by the content
// script's rig.

export type { Voice };

export const createVoice = (bubble: HTMLElement, coachId: number): Voice =>
  createCoachVoice(bubble, {
    talk: (mood, talking) => postCoachState({ coach: coachId, mood, talking }),
    emptyClass: 'ln-ext-end__bubble--empty',
  });
