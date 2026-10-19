import { describe, expect, it } from 'vitest';
import { readSetup } from './stage.ts';

const main = (setup: string): HTMLElement => {
  const element = document.createElement('main');
  element.innerHTML = `<div class="game__meta__infos" data-icon="\u{e008}"><div class="header">${setup}</div></div>`;
  return element;
};

describe('the game’s setup, for the intros', () => {
  it('reads the info’s line as Lichess writes it', () => {
    expect(
      readSetup(main('<div class="setup">3+2 • Rated • <a href="/blitz">Blitz</a></div>')),
    ).toEqual({
      icon: '\u{e008}',
      parts: ['3+2', 'Rated', 'Blitz'],
    });
  });

  it('reads it once split into spans (content/game/game-meta.ts)', () => {
    const split =
      '<div class="setup" data-ln-ext-parts=""><span class="ln-ext-part">3+2</span>' +
      '<span class="ln-ext-part">Casual</span><a href="/blitz">Blitz</a></div>';
    expect(readSetup(main(split)).parts).toEqual(['3+2', 'Casual', 'Blitz']);
  });

  it('has nothing to say where there’s no info', () => {
    expect(readSetup(document.createElement('main'))).toEqual({ icon: undefined, parts: [] });
  });
});
