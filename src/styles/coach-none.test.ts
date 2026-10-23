import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';

// With no coach (#shared/coach.ts), <html> carries `none`: each place's coach goes, and the
// computer's robot with it.

const style = (...files: string[]): void => {
  const sheet = document.createElement('style');
  sheet.textContent = files
    .map(file => readFileSync(join(import.meta.dirname, file), 'utf8'))
    .join('\n');
  document.head.append(sheet);
};

// happy-dom keeps a computed style once read: each look draws the markup anew.
const draw = (markup: string, coach: string): void => {
  document.documentElement.dataset.lnExtCoach = coach;
  document.body.innerHTML = markup;
};

const shown = (selector: string): string => {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element).display;
};

const card = (): CSSStyleDeclaration => {
  const found = queryOne(document, '.ln-ext-coach', HTMLElement);
  if (!found) throw new Error('no card');
  return getComputedStyle(found);
};

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  delete document.documentElement.dataset.lnExtCoach;
});

describe('no coach', () => {
  it('takes every coach’s avatar away, and only with none', () => {
    style('coach-avatar.css');
    const avatar = '<button class="ln-ext-coach__avatar"></button>';
    draw(avatar, '3');
    expect(shown('.ln-ext-coach__avatar')).not.toBe('none');
    draw(avatar, 'none');
    expect(shown('.ln-ext-coach__avatar')).toBe('none');
  });

  it('takes the robot off the computer’s levels', () => {
    style('pages/level-slider.css');
    draw('<span class="ln-ext-level__robot"></span>', 'none');
    expect(shown('.ln-ext-level__robot')).toBe('none');
  });

  it('gives the review’s card no room for the coach’s hops', () => {
    style('review/coach.css', 'review/bubble.css');
    const review = '<div id="ln-ext-review"><div class="ln-ext-coach"></div></div>';
    draw(review, '3');
    expect(card().height).toBe('136px');
    draw(review, 'none');
    expect(card().height).toBe('96px');
    expect(card().paddingLeft).toBe('16px');
  });
});
