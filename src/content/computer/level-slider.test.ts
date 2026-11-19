import { afterEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { syncLevelSlider } from './level-slider.ts';

vi.mock('#content/ui/sounds.ts', () => ({ playUiSound: vi.fn<() => void>() }));

// The computer's level as Lichess draws it since its radio groups' rewrite (lib/view/radio).
const levels = (checked: number): string =>
  '<dialog open><div class="game-setup"><div class="setup-content"><div class="config-group">' +
  '<div class="label">Strength</div><group class="radio">' +
  Array.from({ length: 8 }, (_, i) => i + 1)
    .map(
      level =>
        `<div><input id="sf-level-${level}" name="sf-level" type="radio" value="${level}"` +
        `${level === checked ? ' checked' : ''}><label for="sf-level-${level}">${level}</label></div>`,
    )
    .join('') +
  '</group></div></div></div></dialog>';

const part = <T extends Element>(selector: string, type: new () => T): T => {
  const found = queryOne(document, selector, type);
  if (!found) throw new Error(`no ${selector}`);
  return found;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('the computer’s level slider', () => {
  it('stands in for Lichess’s buttons, at their level', () => {
    document.body.innerHTML = levels(3);
    expect(syncLevelSlider()?.level).toBe(3);
    expect(part('group.radio', HTMLElement).dataset.lnExtSlid).toBe('');
    expect(part('.config-group > .ln-ext-level', HTMLElement).dataset.lnExtTier).toBeDefined();
    expect(part('.ln-ext-level__input', HTMLInputElement).value).toBe('3');
    expect(part('.ln-ext-level__value b', HTMLElement).textContent).toBe('3');
    expect(part('.ln-ext-level__value span', HTMLElement).textContent).toBe('~800');
  });

  it('picks the level it’s moved to', () => {
    document.body.innerHTML = levels(1);
    syncLevelSlider();
    const input = part('.ln-ext-level__input', HTMLInputElement);
    input.value = '6';
    input.dispatchEvent(new Event('input'));
    expect(part('#sf-level-6', HTMLInputElement).checked).toBe(true);
    expect(syncLevelSlider()?.level).toBe(6);
  });

  it('is built once', () => {
    document.body.innerHTML = levels(2);
    syncLevelSlider();
    syncLevelSlider();
    expect(document.querySelectorAll('.ln-ext-level')).toHaveLength(1);
  });

  it('stays away from other setups', () => {
    document.body.innerHTML = '<dialog open><div class="game-setup"></div></dialog>';
    expect(syncLevelSlider()).toBeNull();
  });
});
