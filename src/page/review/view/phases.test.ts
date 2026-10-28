import { afterEach, describe, expect, it } from 'vitest';
import { phaseLinesMarkup, phaseStarts } from './phases.ts';

afterEach(() => {
  Reflect.deleteProperty(window, 'i18n');
});

const SIZE = { width: 300, height: 100 };
const STARTS = [
  { index: 10, name: 'Middlegame' },
  { index: 40, name: 'Endgame' },
];

function names(toggleBelow: number): { text: string | null; y: string | null }[] {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.innerHTML = phaseLinesMarkup({ starts: STARTS, toggleBelow }, SIZE, {
    x: index => index * 5,
    areaBelow: true,
  }).value;
  return [...svg.querySelectorAll('text')].map(text => ({
    text: text.textContent,
    y: text.getAttribute('y'),
  }));
}

describe('the phases on the review’s graphs', () => {
  it('starts the middlegame and the endgame where the game reaches them, in Lichess’s words', () => {
    Object.assign(window, { i18n: { site: { middlegame: 'Milieu de partie' } } });
    expect(phaseStarts({ middle: 12, end: -1 })).toEqual([{ index: 12, name: 'Milieu de partie' }]);
    expect(phaseStarts({ middle: -1, end: -1 })).toEqual([]);
  });

  it('names them at the bottom, the one under the views toggle at the top', () => {
    expect(names(0)).toEqual([
      { text: 'Middlegame', y: '95' },
      { text: 'Endgame', y: '95' },
    ]);
    expect(names(162)).toEqual([
      { text: 'Middlegame', y: '11' },
      { text: 'Endgame', y: '95' },
    ]);
  });
});
