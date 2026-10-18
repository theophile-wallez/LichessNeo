import type { CoachMood } from './coach.ts';
import { html, setHtml } from './html.ts';

// The coach's words in a bubble, typed out as the coach speaks, word by word
// as in Game Review (each fading in where it already holds its place,
// review/bubble.css): its mouth moves while the words come. The game over's
// card speaks this way, and the Learn stages' coach.

/** A word's turn to show, as the coach types its words out. */
export const WORD_MS = 35;

// Words said at once still get a moment of talking.
const TALK_MS = 1200;

export interface Voice {
  /** Says the words at once. */
  readonly say: (text: string, mood: CoachMood) => void;
  /** Empties the bubble, then types the words out after `delayMs`. */
  readonly typeOut: (text: string, mood: CoachMood, delayMs: number) => void;
}

export interface VoiceOptions {
  /** Plays the coach's face: its mood, and whether its mouth moves. */
  readonly talk: (mood: CoachMood, talking: boolean) => void;
  /** The bubble's class while it waits for its words. */
  readonly emptyClass: string;
}

export function createVoice(bubble: HTMLElement, { talk, emptyClass }: VoiceOptions): Voice {
  let timer = 0;
  const cancel = (): void => {
    clearTimeout(timer);
    clearInterval(timer);
  };
  return {
    say: (text, mood) => {
      cancel();
      bubble.classList.toggle(emptyClass, false);
      bubble.textContent = text;
      talk(mood, true);
      timer = window.setTimeout(() => talk(mood, false), TALK_MS);
    },
    typeOut: (text, mood, delayMs) => {
      cancel();
      bubble.textContent = '';
      bubble.classList.toggle(emptyClass, true);
      talk(mood, false);
      timer = window.setTimeout(() => {
        const words = text.match(/\S+\s*/g) ?? [];
        setHtml(
          bubble,
          html`${words.map(word => html`<span class="ln-ext-w ln-ext-w--off">${word}</span>`)}`,
        );
        bubble.classList.toggle(emptyClass, false);
        talk(mood, true);
        const spans = [...bubble.children];
        let shown = 0;
        timer = window.setInterval(() => {
          const word = spans[shown++];
          if (word) word.className = 'ln-ext-w ln-ext-w--in';
          if (shown < spans.length) return;
          clearInterval(timer);
          talk(mood, false);
        }, WORD_MS);
      }, delayMs);
    },
  };
}
