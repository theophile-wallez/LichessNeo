import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { queryAll, queryOne } from '#shared/dom.ts';

// A game's columns as lila serves them (views/game/crosstable.scala): a draw has no class.
const WIN = '<povs><a class="glpt win">1</a><a class="glpt loss">0</a></povs>';
const DRAW = '<povs><a class="glpt">½</a><a class="glpt">½</a></povs>';
const CURRENT = '<povs class="current"><a class="glpt win">1</a><a class="glpt loss">0</a></povs>';

function crosstable(games: string): string {
  return (
    '<main class="round"><div class="crosstable"><fill></fill>' +
    games +
    '<div class="crosstable__users"><a class="user-link">Eresy</a><a class="user-link">Chlodowech</a></div>' +
    '<div class="crosstable__score"><span class="win">1</span><span class="loss">0</span></div>' +
    '</div></main>'
  );
}

function styleOf(selector: string): CSSStyleDeclaration {
  const element = queryOne(document, selector, HTMLElement);
  if (!element) throw new Error(`no ${selector}`);
  return getComputedStyle(element);
}

beforeEach(() => {
  const style = document.createElement('style');
  style.textContent =
    ':root { --ln-ext-yellow: #f1fa8c; --ln-ext-text-dim: #8e8e93; }' +
    readFileSync(join(import.meta.dirname, 'crosstable.css'), 'utf8');
  document.head.append(style);
});

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('the crosstable', () => {
  it('shows a first game alone, without the scores that only repeat it', () => {
    document.body.innerHTML = crosstable(CURRENT);
    expect(styleOf('.crosstable__score').display).toBe('none');
    expect(styleOf('povs.current a').transform).not.toContain('scale');
  });

  it('sets the game on show apart once there are others, beside the scores', () => {
    document.body.innerHTML = crosstable(WIN + DRAW + CURRENT);
    expect(styleOf('.crosstable__score').display).toBe('flex');
    expect(styleOf('povs.current a').transform).toBe('scale(1.1)');
  });

  it('tints a draw apart from a loss', () => {
    document.body.innerHTML = crosstable(WIN + DRAW + CURRENT);
    const [draw] = queryAll(document, 'povs:nth-of-type(2) a', HTMLElement);
    const [, loss] = queryAll(document, 'povs:nth-of-type(1) a', HTMLElement);
    if (!draw || !loss) throw new Error('no draw or loss');
    expect(getComputedStyle(draw).color).toBe('#f1fa8c');
    expect(getComputedStyle(loss).color).toBe('#8e8e93');
  });
});
