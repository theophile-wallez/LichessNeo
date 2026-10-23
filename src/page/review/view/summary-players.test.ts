import { afterEach, describe, expect, it } from 'vitest';
import { avatarOf } from '#shared/avatar.ts';
import { chesscomRating } from '#shared/chesscom-rating/convert.ts';
import { keepChesscomShown } from '#shared/chesscom-rating/shown.ts';
import { COLORS } from '#shared/chess/types.ts';
import { queryAll } from '#shared/dom.ts';
import { setHtml } from '#shared/html.ts';
import { keepOwnAvatar } from '#shared/own-avatar.ts';
import { keepOwnName } from '#shared/own-name.ts';
import { IMAGE } from '#shared/testing/packs.ts';
import { en } from '#page/review/i18n/en.ts';
import type { Review } from '#page/review/session.ts';
import { playerName, playersMarkup, type PlayersInput } from './summary-players.ts';

const ERESY = { color: 'white', user: { username: 'Eresy' } } as const;
const HIKARU = { color: 'black', user: { username: 'Hikaru' } } as const;

const REVIEW: Review = {
  moves: [],
  draft: [],
  total: 0,
  complete: true,
  positions: [],
  accuracy: { white: 84.2, black: 71.5 },
  counts: { white: {}, black: {} },
  rating: {
    white: { elo: 1850, phases: { opening: null, tactics: null, strategy: null, endgame: null } },
    black: null,
  },
};

function summary(input: Partial<PlayersInput> = {}): HTMLElement {
  const root = document.createElement('div');
  setHtml(
    root,
    playersMarkup({
      review: null,
      players: { white: ERESY, black: HIKARU },
      winner: null,
      language: en,
      order: COLORS,
      ...input,
    }),
  );
  return root;
}

const ratings = (root: HTMLElement): (string | undefined)[][] =>
  queryAll(root, '.ln-ext-sum-player__rating > b', HTMLElement).map(rating => [
    rating.textContent,
    rating.dataset.lnExtTip,
  ]);

afterEach(() => {
  localStorage.clear();
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
    const names = queryAll(summary(), '.ln-ext-sum-player__name', HTMLElement);
    expect(names.map(name => name.textContent)).toEqual(['Captain Kitty', 'Hikaru']);
  });

  it('give the signed-in user their own avatar', () => {
    document.body.dataset.user = 'eresy';
    keepOwnAvatar({ kind: 'picture', picture: IMAGE });
    const [own, other] = queryAll(summary(), '.ln-ext-avatar', HTMLElement);
    expect(own?.dataset.lnExtAvatarPicture).toBe('');
    expect(own?.dataset.lnExtAvatarCoach).toBe(String(avatarOf('Eresy').coach));
    expect(other?.dataset.lnExtAvatarPicture).toBeUndefined();
    expect(other?.dataset.lnExtAvatarCoach).toBe(String(avatarOf('Hikaru').coach));
  });

  it('give a game rating as on Chess.com with the Chess.com ratings on, Lichess’s in its tooltip', () => {
    expect(ratings(summary({ review: REVIEW, speed: 'blitz' }))).toEqual([
      ['1850', undefined],
      ['—', undefined],
    ]);
    keepChesscomShown(true);
    const equivalent = String(chesscomRating('blitz', 1850)?.rating);
    const root = summary({ review: REVIEW, speed: 'blitz' });
    expect(ratings(root)).toEqual([
      [equivalent, '1850 on Lichess'],
      ['—', undefined],
    ]);
    expect(root.querySelector('.ln-ext-sum-player__elo')?.textContent).toMatch(
      new RegExp(`played like an? ${equivalent} Elo`),
    );
    expect(ratings(summary({ review: REVIEW, speed: 'ultraBullet' }))[0]).toEqual([
      '1850',
      undefined,
    ]);
  });
});

const accuracies = (root: HTMLElement): (string | null)[] =>
  queryAll(root, '.ln-ext-acc', HTMLElement).map(accuracy => accuracy.textContent);

describe('a player’s accuracy', () => {
  it('is blank while the analysis runs, and a dash once done for a side without a move', () => {
    const none = { ...REVIEW, accuracy: { white: 100, black: null } };
    expect(accuracies(summary({ review: { ...none, complete: false } }))).toEqual([
      '100.0',
      '\u00a0',
    ]);
    expect(accuracies(summary({ review: none }))).toEqual(['100.0', '—']);
  });
});
