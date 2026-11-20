import { describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { CLASS_COLORS } from '#page/review/classes/classes.ts';
import { drawPeek, type PeekInput, peekFrameMarkup } from './card-peek.ts';

function render(input: PeekInput): HTMLElement {
  const root = document.createElement('span');
  setHtml(root, peekFrameMarkup());
  const peek = queryOne(root, '.ln-ext-end__peek', HTMLElement);
  if (peek) drawPeek(peek, input);
  return root;
}

const heading = { tag: 'Victory · by resignation', title: 'You beat <i>bob</i>!' };

describe('peekMarkup', () => {
  it('sums the card up: its coach, its heading, the accuracy and the count it ends on', () => {
    const root = render({
      heading,
      coachId: 5,
      mood: 'sad',
      figures: { accuracy: '91.2%', moveClass: 'mistake', count: 1 },
    });
    expect(queryOne(root, '.ln-ext-end__peek-coach', HTMLElement)?.dataset.lnExtAvatarCoach).toBe(
      '5',
    );
    expect(root.querySelector('.ln-ext-end__peek-tag')?.textContent).toBe(heading.tag);
    expect(root.querySelector('.ln-ext-end__peek-title')?.textContent).toBe(heading.title);
    expect(root.querySelector('.ln-ext-end__peek-accuracy')?.textContent).toBe('91.2%');
    const count = queryOne(root, '.ln-ext-end__peek-count', HTMLElement);
    expect(count?.querySelector('b')?.textContent).toBe('1');
    expect(count?.querySelector('svg')).not.toBeNull();
    expect(count?.style.getPropertyValue('--ln-ext-count-c')).toBe(CLASS_COLORS.mistake);
  });

  it('says how far the analysis has got until the figures come', () => {
    const root = render({ heading, coachId: 1, mood: 'neutral', figures: 'Analyzing game… 42%' });
    expect(root.querySelector('.ln-ext-end__peek-progress')?.textContent).toBe(
      'Analyzing game… 42%',
    );
    expect(root.querySelector('.ln-ext-end__peek-accuracy')).toBeNull();
    expect(root.querySelector('.ln-ext-end__peek-count')).toBeNull();
  });

  it('leaves the tag out when the heading has none', () => {
    const root = render({
      heading: { tag: '', title: 'Debrief' },
      coachId: 1,
      mood: 'neutral',
      figures: '',
    });
    expect(root.querySelector('.ln-ext-end__peek-tag')).toBeNull();
    expect(root.querySelector('.ln-ext-end__peek-title')?.textContent).toBe('Debrief');
  });

  it('keeps its coach from one draw to the next, in the face it’s given', () => {
    const root = render({ heading, coachId: 4, mood: 'neutral', figures: 'Analyzing game… 10%' });
    const coach = queryOne(root, '.ln-ext-end__peek-coach', HTMLElement);
    const peek = queryOne(root, '.ln-ext-end__peek', HTMLElement);
    if (!peek) throw new Error('no strip');
    drawPeek(peek, {
      heading,
      coachId: 4,
      mood: 'sad',
      figures: { accuracy: '53.6%', moveClass: 'blunder', count: 1 },
    });
    expect(queryOne(root, '.ln-ext-end__peek-coach', HTMLElement)).toBe(coach);
    expect(coach?.dataset.lnExtMood).toBe('sad');
    expect(root.querySelector('.ln-ext-end__peek-accuracy')?.textContent).toBe('53.6%');
  });
});
