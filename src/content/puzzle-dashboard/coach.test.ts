import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import type { Tip } from './coach-line.ts';
import type { Overview } from './data.ts';
import { startCoach, turned } from './coach.ts';
import { summaryMarkup } from './summary.ts';

// The tips name their messages.
beforeEach(() => {
  vi.stubGlobal('chrome', { i18n: { getMessage: (name: string): string => name } });
});

afterEach(() => {
  document.body.innerHTML = '';
});

const tip = (lead: string): Tip => ({
  lead: { name: lead, values: [] },
  body: { name: 'body', values: [] },
  mood: 'happy',
});

const OVERVIEW: Overview = {
  days: 30,
  puzzles: 40,
  firstWins: 30,
  level: 1800,
  performance: 1850,
  toReplay: 0,
  themes: [],
  fewer: 0,
  weakest: [],
  strongest: [],
};

describe('turning the coach’s tips', () => {
  it('goes on or back, round the ends', () => {
    expect(turned(0, 'next', 4)).toBe(1);
    expect(turned(3, 'next', 4)).toBe(0);
    expect(turned(1, 'back', 4)).toBe(0);
    expect(turned(0, 'back', 4)).toBe(3);
  });

  it('turns them with no coach to say them', () => {
    const tips = [tip('first'), tip('second')];
    setHtml(
      document.body,
      summaryMarkup({ view: OVERVIEW, tips, coachId: null, replayHref: null }),
    );
    const section = queryOne(document, '.ln-ext-pdash__coach', HTMLElement);
    if (!section) throw new Error('no coach card');
    expect(queryOne(section, '.ln-ext-pdash__mascot', HTMLElement)).toBeNull();
    startCoach(section, tips, null);
    queryOne(section, "[data-ln-ext-turn='next']", HTMLButtonElement)?.click();
    const said = queryAll(section, '.ln-ext-pdash__say:not([data-ln-ext-leave]) b', HTMLElement);
    expect(said.map(lead => lead.textContent)).toEqual(['second']);
    const dots = queryAll(section, '.ln-ext-pdash__dots > i', HTMLElement);
    expect(dots.map(dot => dot.dataset.lnExtOn)).toEqual([undefined, '']);
  });
});
