import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { avatarOf } from '#shared/avatar.ts';
import { queryAll, queryOne } from '#shared/dom.ts';
import { keepOwnAvatar } from '#shared/own-avatar.ts';
import { keepOwnName } from '#shared/own-name.ts';
import { flush } from '#shared/testing/timers.ts';
import { pictureFrom } from './avatar-picture.ts';
import { buildAvatarCard } from './avatar-card.ts';

// happy-dom can't decode an image nor draw one on a canvas.
vi.mock('./avatar-picture.ts', () => ({
  pictureFrom: vi.fn<(file: Blob) => Promise<string | null>>(),
}));

// The card's markup names its messages as its module loads.
const i18n = vi.hoisted(() => {
  const messages = { getMessage: (name: string): string => name };
  vi.stubGlobal('chrome', { i18n: messages });
  return messages;
});

const PICTURE = 'data:image/webp;base64,UklGRg==';
const NAMED = avatarOf('Alice');

beforeEach(() => {
  vi.stubGlobal('chrome', { i18n });
  document.body.dataset.username = 'Alice';
  document.body.dataset.user = 'alice';
});

afterEach(() => {
  keepOwnAvatar(null);
  keepOwnName(null);
  document.body.innerHTML = '';
  delete document.body.dataset.username;
  delete document.body.dataset.user;
  localStorage.clear();
});

const stored = (): unknown => JSON.parse(localStorage.getItem('ln-ext-avatar') ?? 'null');

function click(card: HTMLElement, selector: string): void {
  const target = queryOne(card, selector, HTMLElement);
  if (!target) throw new Error(`no ${selector}`);
  target.click();
}

async function upload(card: HTMLElement, file: File): Promise<void> {
  const input = queryOne(card, 'input[type=file]', HTMLInputElement);
  if (!input) throw new Error('no upload');
  const files = new DataTransfer();
  files.items.add(file);
  input.files = files.files;
  input.dispatchEvent(new Event('change'));
  await flush();
}

const shownPanel = (card: HTMLElement): (string | undefined)[] =>
  queryAll(card, '.ln-ext-avatar-pick__panel', HTMLElement)
    .filter(panel => !panel.hidden)
    .map(panel => panel.dataset.lnExtAvatarMode);
const preview = (card: HTMLElement): DOMStringMap | undefined =>
  queryOne(card, '.ln-ext-avatar-pick__preview', HTMLElement)?.dataset;
const pressed = (card: HTMLElement): (string | undefined)[] =>
  queryAll(card, '[aria-pressed=true]', HTMLElement).map(
    tile => tile.dataset.lnExtPickCoach ?? tile.dataset.lnExtPickColor,
  );

describe('the settings’ avatar card', () => {
  it('starts on the avatar of the user’s name, under their name', () => {
    keepOwnName('Captain');
    const card = buildAvatarCard();
    expect(shownPanel(card)).toEqual(['name']);
    expect(preview(card)?.lnExtAvatarCoach).toBe(String(NAMED.coach));
    expect(preview(card)?.lnExtAvatarColor).toBe(NAMED.color);
    expect(queryOne(card, '.ln-ext-avatar-pick__name', HTMLElement)?.textContent).toBe('Captain');
  });

  it('makes one of the name’s coach and color, then of the coach and color picked', () => {
    const card = buildAvatarCard();
    click(card, "button[data-ln-ext-avatar-mode='coach']");
    expect(stored()).toEqual({ kind: 'coach', coach: NAMED.coach, color: NAMED.color });
    expect(shownPanel(card)).toEqual(['coach']);
    click(card, "[data-ln-ext-pick-coach='8']");
    click(card, "[data-ln-ext-pick-color='pink']");
    expect(stored()).toEqual({ kind: 'coach', coach: 8, color: 'pink' });
    expect(pressed(card)).toEqual(['8', 'pink']);
    expect(preview(card)?.lnExtAvatarCoach).toBe('8');
  });

  it('goes back to the name’s avatar', () => {
    keepOwnAvatar({ kind: 'coach', coach: 2, color: 'green' });
    const card = buildAvatarCard();
    expect(shownPanel(card)).toEqual(['coach']);
    click(card, "button[data-ln-ext-avatar-mode='name']");
    expect(stored()).toBeNull();
    expect(pressed(card)).toEqual([]);
  });

  it('waits for a picture before it changes the pick, and keeps a good one', async () => {
    keepOwnAvatar({ kind: 'coach', coach: 2, color: 'green' });
    const card = buildAvatarCard();
    click(card, "button[data-ln-ext-avatar-mode='picture']");
    expect(shownPanel(card)).toEqual(['picture']);
    expect(stored()).toEqual({ kind: 'coach', coach: 2, color: 'green' });
    vi.mocked(pictureFrom).mockResolvedValue(PICTURE);
    await upload(card, new File(['x'], 'me.png', { type: 'image/png' }));
    expect(stored()).toEqual({ kind: 'picture', picture: PICTURE });
    expect(preview(card)?.lnExtAvatarPicture).toBe('');
    expect(queryOne(card, '.ln-ext-avatar-pick__error', HTMLElement)?.hidden).toBe(true);
  });

  it('says so when the file isn’t a picture, and keeps the pick', async () => {
    const card = buildAvatarCard();
    click(card, "button[data-ln-ext-avatar-mode='picture']");
    vi.mocked(pictureFrom).mockResolvedValue(null);
    await upload(card, new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(stored()).toBeNull();
    expect(queryOne(card, '.ln-ext-avatar-pick__error', HTMLElement)?.hidden).toBe(false);
    expect(shownPanel(card)).toEqual(['picture']);
  });

  it('follows a pick made in another tab', () => {
    const card = buildAvatarCard();
    localStorage.setItem(
      'ln-ext-avatar',
      JSON.stringify({ kind: 'coach', coach: 5, color: 'cyan' }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: 'ln-ext-avatar' }));
    expect(shownPanel(card)).toEqual(['coach']);
    expect(pressed(card)).toEqual(['5', 'cyan']);
  });
});
