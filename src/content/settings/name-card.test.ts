import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queryOne } from '#shared/dom.ts';
import { keepOwnName } from '#shared/own-name.ts';
import { buildNameCard } from './name-card.ts';

// The card's markup names its messages as its module loads.
const i18n = vi.hoisted(() => {
  const messages = { getMessage: (name: string): string => name };
  vi.stubGlobal('chrome', { i18n: messages });
  return messages;
});

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n });
  document.body.dataset.username = 'Alice';
});

afterEach(() => {
  keepOwnName(null);
  document.body.innerHTML = '';
  delete document.body.dataset.username;
  localStorage.clear();
});

function card(): { card: HTMLElement; input: HTMLInputElement; reset: HTMLElement } {
  const built = buildNameCard();
  document.body.append(built);
  const input = queryOne(built, 'input', HTMLInputElement);
  const reset = queryOne(built, '.ln-ext-name-pick__reset', HTMLElement);
  if (!input || !reset) throw new Error('no field');
  return { card: built, input, reset };
}

const save = (built: HTMLElement): void =>
  queryOne(built, '.ln-ext-name-pick__save', HTMLElement)?.click();

const stored = (): string | null => localStorage.getItem('ln-ext-name');

// Another tab's pick, which this one hears of as a storage event.
function pickElsewhere(name: string): void {
  localStorage.setItem('ln-ext-name', name);
  window.dispatchEvent(new StorageEvent('storage', { key: 'ln-ext-name' }));
}

describe('the settings’ name card', () => {
  it('shows the user’s own name under the field until they pick one', () => {
    const { input, reset } = card();
    expect(input.placeholder).toBe('Alice');
    expect(input.value).toBe('');
    expect(reset.hidden).toBe(true);
  });

  it('keeps the name typed, trimmed, once saved', () => {
    const { card: built, input, reset } = card();
    input.value = '  Captain  ';
    save(built);
    expect(stored()).toBe('Captain');
    expect(input.value).toBe('Captain');
    expect(reset.hidden).toBe(false);
  });

  it('keeps the name typed when saved after the field blurs', () => {
    const { card: built, input } = card();
    input.focus();
    input.value = 'Captain';
    input.blur();
    save(built);
    expect(stored()).toBe('Captain');
  });

  it('shows the name as kept once saved with Enter, the field still focused', () => {
    const { card: built, input } = card();
    input.focus();
    input.value = '  Captain  ';
    queryOne(built, 'form', HTMLFormElement)?.requestSubmit();
    expect(stored()).toBe('Captain');
    expect(input.value).toBe('Captain');
    input.focus();
    input.value = 'Alice';
    queryOne(built, 'form', HTMLFormElement)?.requestSubmit();
    expect(stored()).toBeNull();
    expect(input.value).toBe('');
  });

  it('keeps none for the user’s own name or a blank one', () => {
    const { card: built, input, reset } = card();
    input.value = 'Captain';
    save(built);
    input.value = 'Alice';
    save(built);
    expect(stored()).toBeNull();
    input.value = '   ';
    save(built);
    expect(stored()).toBeNull();
    expect(reset.hidden).toBe(true);
  });

  it('goes back to the user’s own name on reset', () => {
    const { card: built, input, reset } = card();
    input.value = 'Captain';
    save(built);
    reset.click();
    expect(stored()).toBeNull();
    expect(input.value).toBe('');
    expect(reset.hidden).toBe(true);
  });

  it('leaves what’s being typed alone as another tab picks a name', () => {
    const { input } = card();
    input.focus();
    input.value = 'Capt';
    pickElsewhere('Pirate');
    expect(input.value).toBe('Capt');
    input.blur();
    pickElsewhere('Sailor');
    expect(input.value).toBe('Sailor');
  });
});
