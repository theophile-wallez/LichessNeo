import { afterEach, describe, expect, it } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { syncRematchLabel } from './rematch-label.ts';

const { dataset } = document.documentElement;

// lila's follow-up, our rematch offer waiting (ui/round/src/view/button.ts).
const WAITING =
  '<main class="round"><div class="rcontrols"><div class="follow-up">' +
  '<button class="fbt rematch white me" aria-label="Proposition de revanche envoyée">' +
  '<span class="ddloader"></span></button></div></div></main>';

const rematch = (): HTMLElement => {
  const button = queryOne(document, '.rematch', HTMLElement);
  if (!button) throw new Error('no rematch');
  return button;
};

afterEach(() => {
  delete dataset.lnExtRematchLabel;
  document.body.replaceChildren();
});

describe('the waiting Rematch’s label', () => {
  it('is Lichess’s word for Rematch', () => {
    dataset.lnExtRematchLabel = 'Revanche';
    document.body.innerHTML = WAITING;
    syncRematchLabel();
    expect(rematch().dataset.lnExtLabel).toBe('Revanche');
  });

  it('waits for Lichess’s translations', () => {
    document.body.innerHTML = WAITING;
    syncRematchLabel();
    expect(rematch().dataset.lnExtLabel).toBeUndefined();
    dataset.lnExtRematchLabel = 'Rematch';
    syncRematchLabel();
    expect(rematch().dataset.lnExtLabel).toBe('Rematch');
  });
});
