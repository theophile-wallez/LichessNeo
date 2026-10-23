import { beforeEach, describe, expect, it } from 'vitest';
import { Explorer } from '#page/lichess/explorer.ts';
import { fakeApi, ndjson, text } from '#page/review/fixtures/fake-api.ts';
import { entry, type ExplorerRow, explorerData } from '#page/review/fixtures/practice.ts';
import { fetchGames, gameDrills, seenPositions } from './games.ts';
import { keepRepertoire } from './repertoire.ts';

const EXPLORER = new Explorer({ opts: { endpoint: 'https://explorer.lichess.ovh' } });

function game(
  moves: string,
  white: string,
  black: string,
  opening?: { name: string; ply: number },
) {
  return {
    id: 'abcd1234',
    variant: 'standard',
    moves,
    players: { white: { user: { id: white, name: white } }, black: { user: { id: black } } },
    ...(opening ? { opening: { eco: 'C50', ...opening } } : {}),
  };
}

const ITALIAN = { name: 'Italian Game', ply: 5 };
const GAMES = [
  game('e4 e5 Bc4 Nc6 Nf3 Nf6', 'alice', 'bob', ITALIAN),
  game('e4 e5 Bc4 Nf6 d3', 'alice', 'carol', ITALIAN),
  game('e4 a6 d4 b5', 'dave', 'alice'),
  game('e4 a6 Nf3', 'erin', 'alice'),
  game('d4 d5', 'alice', 'frank'),
  { ...game('e4 a6 d4', 'gina', 'alice'), variant: 'chess960' },
];

/** The masters' moves by the moves played to their position, in UCI. */
const MASTERS: Readonly<Record<string, readonly ExplorerRow[]>> = {
  '': [
    ['e4', 'e2e4', 500],
    ['d4', 'd2d4', 450],
  ],
  e2e4: [
    ['c5', 'c7c5', 500],
    ['e5', 'e7e5', 400],
    ['a6', 'a7a6', 1],
  ],
};

beforeEach(() => {
  keepRepertoire([]);
});

describe('fetchGames', () => {
  it('asks for the user’s recent rated games with their moves and openings', async () => {
    const asked = fakeApi([[/^\/api\/games\/user\//, () => ndjson(GAMES.slice(0, 2))]]);
    const games = await fetchGames('Alice Smith');
    expect(games).toHaveLength(2);
    expect(games[0]?.opening).toEqual(ITALIAN);
    const url = new URL(asked[0]?.url ?? '', 'https://lichess.org');
    expect(url.pathname).toBe('/api/games/user/Alice%20Smith');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      max: '50',
      rated: 'true',
      moves: 'true',
      opening: 'true',
    });
    expect(asked[0]?.headers.get('Accept')).toBe('application/x-ndjson');
  });

  it('skips a line of another shape, and fails on Lichess’s refusal', async () => {
    fakeApi([[/games/, () => text(`{"variant":"standard"}\n${JSON.stringify(GAMES[0])}\n\n`)]]);
    expect(await fetchGames('alice')).toHaveLength(1);
    fakeApi([[/games/, () => text('', 429)]]);
    await expect(fetchGames('alice')).rejects.toThrow('Games: 429');
  });
});

describe('seenPositions', () => {
  it('counts the user’s moves from each position reached in several games', () => {
    const seen = seenPositions(GAMES, 'alice');
    const summary = seen.map(each => [
      each.side,
      each.moves.join(' '),
      each.games,
      [...each.played],
    ]);
    expect(summary).toEqual([
      [
        'white',
        '',
        3,
        [
          ['e4', 2],
          ['d4', 1],
        ],
      ],
      ['white', 'e4 e5', 2, [['Bc4', 2]]],
      ['black', 'e4', 2, [['a6', 2]]],
    ]);
  });

  it('names a position by its game’s opening once reached', () => {
    const bishops = { name: "Bishop's Opening", ply: 3 };
    const twice = [1, 2].map(() => game('e4 e5 Bc4 Nc6 Nf3', 'alice', 'bob', bishops));
    const seen = seenPositions(twice, 'alice');
    expect(seen.map(each => [each.moves.join(' '), each.name])).toEqual([
      ['', ''],
      ['e4 e5', ''],
      ['e4 e5 Bc4 Nc6', "Bishop's Opening"],
    ]);
    expect(seenPositions(GAMES, 'nobody')).toEqual([]);
  });
});

/** The masters' database, answering from `MASTERS`: the moves it was asked after. */
function masters(): string[] {
  const plays: string[] = [];
  fakeApi([
    [
      /masters/,
      request => {
        const play = new URL(request.url).searchParams.get('play') ?? '';
        plays.push(play);
        const rows = MASTERS[play];
        return rows ? ndjson([explorerData(rows, 'Owen Defense')]) : text('', 404);
      },
    ],
  ]);
  return plays;
}

describe('gameDrills', () => {
  it('drills a habit the masters hardly play, with their main moves', async () => {
    const plays = masters();
    const drills = await gameDrills(EXPLORER, { games: GAMES, user: 'alice' });
    expect(drills).toEqual([
      {
        side: 'black',
        moves: ['e4'],
        name: 'Owen Defense',
        habit: 'a6',
        times: 2,
        games: 2,
        better: ['c5', 'e5'],
        why: 'book',
      },
    ]);
    expect(plays.toSorted()).toEqual(['', 'e2e4', 'e2e4,e7e5']);
  });

  it('drills a habit that leaves the user’s repertoire, without asking the masters', async () => {
    keepRepertoire([
      entry({ moves: ['e4', 'e5'], answers: ['Nf3'], name: 'King’s Knight Opening' }),
    ]);
    const plays = masters();
    const drills = await gameDrills(EXPLORER, { games: GAMES, user: 'alice' });
    expect(drills.find(drill => drill.why === 'repertoire')).toEqual({
      side: 'white',
      moves: ['e4', 'e5'],
      name: 'King’s Knight Opening',
      habit: 'Bc4',
      times: 2,
      games: 2,
      better: ['Nf3'],
      why: 'repertoire',
    });
    expect(plays).not.toContain('e2e4,e7e5');
  });

  it('drills only the first habit of a line that left the book', async () => {
    keepRepertoire([
      entry({ moves: [], answers: ['d4'] }),
      entry({ moves: ['e4', 'e5'], answers: ['Nf3'] }),
    ]);
    masters();
    const drills = await gameDrills(EXPLORER, { games: GAMES, user: 'alice' });
    expect(drills.map(drill => [drill.moves.join(' '), drill.habit])).toEqual([
      ['', 'e4'],
      ['e4', 'a6'],
    ]);
  });
});
