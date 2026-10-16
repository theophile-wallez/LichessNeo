import { afterEach, describe, expect, it } from 'vitest';
import { syncNewGame } from './new-game.ts';
import { newGameLabel } from '#shared/time-control.ts';
// The original's labels, and what it did to each follow-up.
import legacy from './fixtures/legacy-new-game.json' with { type: 'json' };

afterEach(() => {
  document.body.innerHTML = '';
  document.documentElement.lang = '';
});

describe('newGameLabel', () => {
  it.each(legacy.labels)('reads as the original for $clock in $lang', ({ lang, clock, label }) => {
    expect(newGameLabel(clock, lang.startsWith('fr'))).toBe(label);
  });
});

describe('the New game button', () => {
  const game = { id: legacy.id, clock: legacy.clock };

  it.each(legacy.followUps)('does what the original did: $name', ({ html, after }) => {
    document.documentElement.lang = 'en';
    document.body.innerHTML = `<main class="round"><div class="rcontrols">${html}</div></main>`;
    syncNewGame(game);
    syncNewGame(game);
    expect(document.querySelector('.follow-up')?.innerHTML).toBe(after);
  });

  it('waits for the clock', () => {
    document.body.innerHTML = `<main class="round"><div class="rcontrols">${legacy.followUps[0]?.html ?? ''}</div></main>`;
    syncNewGame(null);
    expect(document.querySelector('.lr-ext-new-game')).toBeNull();
  });
});
