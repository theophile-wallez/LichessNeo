import { afterEach, describe, expect, it } from 'vitest';
import { avatarOf } from '#shared/avatar.ts';
import { COLORS } from '#shared/chess/types.ts';
import { queryAll } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { keepOwnAvatar } from '#shared/own-avatar.ts';
import { keepOwnName } from '#shared/own-name.ts';
import { IMAGE } from '#shared/testing/packs.ts';
import { en } from '#page/review/i18n/en.ts';
import { playerName, playersMarkup } from './summary-players.ts';

const ERESY = { color: 'white', user: { username: 'Eresy' } } as const;
const HIKARU = { color: 'black', user: { username: 'Hikaru' } } as const;

function summary(): HTMLElement {
  const root = document.createElement('div');
  setHtml(
    root,
    playersMarkup({
      review: null,
      players: { white: ERESY, black: HIKARU },
      winner: null,
      language: en,
      order: COLORS,
    }),
  );
  return root;
}

afterEach(() => {
  keepOwnName(null);
  keepOwnAvatar(null);
  delete document.body.dataset.user;
});

describe('the summary’s players', () => {
  it('name the signed-in user as they named themselves, and no one else', () => {
    keepOwnName('Captain Kitty');
    expect(playerName(ERESY, en)).toBe('Eresy');
    document.body.dataset.user = 'eresy';
    expect(playerName(ERESY, en)).toBe('Captain Kitty');
    expect(playerName(HIKARU, en)).toBe('Hikaru');
    const names = queryAll(summary(), '.lr-ext-sum-player__name', HTMLElement);
    expect(names.map(name => name.textContent)).toEqual(['Captain Kitty', 'Hikaru']);
  });

  it('give the signed-in user their own avatar', () => {
    document.body.dataset.user = 'eresy';
    keepOwnAvatar({ kind: 'picture', picture: IMAGE });
    const [own, other] = queryAll(summary(), '.lr-ext-avatar', HTMLElement);
    expect(own?.dataset.lrExtAvatarPicture).toBe('');
    expect(own?.dataset.lrExtAvatarCoach).toBe(String(avatarOf('Eresy').coach));
    expect(other?.dataset.lrExtAvatarPicture).toBeUndefined();
    expect(other?.dataset.lrExtAvatarCoach).toBe(String(avatarOf('Hikaru').coach));
  });
});
