import { afterEach, describe, expect, it } from 'vitest';
import { roundsProgress, syncMedals, syncRounds } from './swiss.ts';
// Round bars and medals as the original set them, before and after a change.
import legacy from './fixtures/legacy-swiss.json' with { type: 'json' };

afterEach(() => {
  document.body.innerHTML = '';
});

describe('swiss rounds and medals', () => {
  it('marks them as the original did, and follows a change', () => {
    document.body.innerHTML = legacy.html;
    syncRounds();
    syncMedals();
    expect(document.body.innerHTML).toBe(legacy.first);
    const round = document.querySelector('.swiss__meta__round');
    if (round) round.textContent = '5/9 rounds';
    const second = document.querySelectorAll('td.rank')[1];
    if (second) second.textContent = '7';
    syncRounds();
    syncMedals();
    expect(document.body.innerHTML).toBe(legacy.second);
  });

  it('reads a round count', () => {
    expect(roundsProgress('3 / 4')).toBe('75%');
    expect(roundsProgress('3/0')).toBeNull();
    expect(roundsProgress('')).toBeNull();
  });
});
