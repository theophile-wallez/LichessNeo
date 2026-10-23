import type { Color } from '#shared/chess/types.ts';
import type { BookCount, BookError, BookSource, PracticeStrings } from './practice-types.ts';
import type { Ways } from './types.ts';
import { modesEn } from './en-practice-modes.ts';
import { homeEn } from './en-practice-home.ts';
import { EN_IDEAS } from './en-ideas.ts';

// The coach's words while practicing an opening against the explorer's games.

const PERCENT = new Intl.NumberFormat('en', { style: 'percent' });
const FINE_PERCENT = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 1 });

/** "45%", and "0.4%" for a rare move, which would read as never played. */
const percent = (share: number): string => (share < 0.01 ? FINE_PERCENT : PERCENT).format(share);

/** Fewer games than this, and a share reads as counts: "2 of 3 games", not "67%". */
const FEW = 10;

/** "45%", or "2 of 3 games" for a position few games reached. */
const amount = ({ games: played, of }: BookCount): string =>
  of < FEW ? `${played} of ${of} game${of === 1 ? '' : 's'}` : percent(played / of);

const sideName = (side: Color): string => (side === 'white' ? 'White' : 'Black');

/** "your games", "DrNykterstein’s games", the masters’, Lichess players’. */
function gamesOf(source: BookSource): string {
  if (source.db !== 'player') return source.db === 'masters' ? 'master games' : 'Lichess games';
  return source.you ? 'your games' : `${source.player}’s games`;
}

/** "2 of your 3 games", "the only master game": few games, counted. */
function counted(source: BookSource, { games: played, of }: BookCount): string {
  if (source.db === 'player') {
    const whose = source.you ? 'your' : `${source.player}’s`;
    return of === 1 ? `${whose} only game` : `${played} of ${whose} ${of} games`;
  }
  const kind = source.db === 'masters' ? 'master' : 'Lichess';
  return of === 1 ? `the only ${kind} game` : `${played} of ${of} ${kind} games`;
}

/** "like the masters", "with your own moves": whose moves the coach answers with. */
function likeWho(source: BookSource): string {
  if (source.db !== 'player')
    return source.db === 'masters' ? 'like the masters' : 'like Lichess players';
  return source.you ? 'with your own moves' : `with ${source.player}’s moves`;
}

/** A move no game of the book played. */
function nobodyPlays(source: BookSource, move: string): Ways {
  if (source.db === 'player')
    return source.you
      ? [`You’ve never played ${move} here.`, `${move}? Not one of your moves.`]
      : [`${source.player} never plays ${move} here.`];
  return source.db === 'masters'
    ? [`No master plays ${move} here.`, `${move}? The masters never go there.`]
    : [`Nobody on Lichess plays ${move} here.`, `${move}? Lichess players never try it.`];
}

const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

const ERRORS: Readonly<Record<BookError, string>> = {
  mistake: 'a mistake',
  miss: 'a miss',
  blunder: 'a blunder',
};

export const practiceEn: PracticeStrings = {
  start: 'Practice openings',
  side: side => `You play ${sideName(side)}`,
  intro: source => [
    `Show me your opening! I’ll answer ${likeWho(source)}.`,
    `Let’s go! I’ll play ${likeWho(source)}.`,
    `Your opening, my book: I answer ${likeWho(source)}.`,
  ],
  switchSide: side => `Play ${sideName(side)}`,
  yourMove: ['Your move!', 'Over to you!', 'Your turn!', 'What’s next?'],
  kinds: {
    main: '{m} is the main move',
    popular: '{m} is a popular choice',
    sideline: '{m} is a sideline',
    rare: '{m} is a rare move',
  },
  share: (source, count) =>
    count.of < FEW
      ? [`Seen in ${counted(source, count)}.`]
      : [
          `${amount(count)} of ${gamesOf(source)} go this way.`,
          `Played in ${amount(count)} of ${gamesOf(source)}.`,
        ],
  mainIs: (move, count) => [
    `Most play ${move} (${amount(count)}).`,
    `The favorite is ${move} (${amount(count)}).`,
  ],
  doubts: error => `Careful: the engine calls it ${ERRORS[error]}.`,
  answers: (side, move) => [
    `${sideName(side)} replies ${move}.`,
    `${sideName(side)} goes ${move}.`,
    `Here comes ${move}!`,
  ],
  punish: error => [
    `That’s ${ERRORS[error]}: punish it!`,
    `${capitalized(ERRORS[error])}! Make them pay.`,
  ],
  outTitle: '{m} leaves the book',
  refused: ['Nope, not that one!', 'Hmm, not that one!', 'Not in my book!', 'Wait, try another!'],
  dubiousTitle: '{m} gives ground',
  refusedDubious: ['Hmm, the engine frowns!', 'Wait, there’s better!', 'Risky one!'],
  tryAgain: ['Try again', 'One more go', 'Have another look'],
  missedOut: (source, move) => nobodyPlays(source, move),
  missedDubious: move => [
    `${move} gets played, but it gives ground.`,
    `${move}? The engine has better.`,
  ],
  missedRare: (_source, move, count) => [
    `${move} is a rare one (${amount(count)}).`,
    `${move}? Hardly anyone plays it (${amount(count)}).`,
  ],
  findBook: source => {
    if (source.db === 'player')
      return [source.you ? 'Find your usual move!' : `Find ${source.player}’s move!`];
    const who = source.db === 'masters' ? 'the masters' : 'Lichess players';
    return [`Find the move ${who} play!`, `What would ${who} play here?`, `Think like ${who}!`];
  },
  stuck: ['Stuck? Grab a hint!', 'A hint might help!', 'Need a nudge? Ask for a hint.'],
  revealedTitle: '{m} is the book move',
  endTitle: ['End of the book', 'Out of theory'],
  doneTitle: ['Line done!', 'Line complete!', 'All done!'],
  lineDone: ['Nailed it!', 'Well played!', 'Smooth!', 'Like a pro!'],
  streak: moves => `${moves} book moves in a row`,
  bestStreak: moves => [`Best streak: ${moves} in a row!`, `${moves} in a row: on fire!`],
  review: count => `Review (${count})`,
  end: [
    'That’s the end of the book!',
    'No more theory: you’re on your own now!',
    'The book stops here!',
  ],
  tally: (inBook, main) => {
    const moves = `${inBook} book move${inBook === 1 ? '' : 's'}`;
    if (main === inBook) return inBook === 1 ? 'The main move. Nice!' : `${moves}, all main ones.`;
    if (main === 0) return `${moves}, off the beaten track.`;
    return `${moves}, ${main} of them main ones.`;
  },
  missesTally: misses =>
    misses === 1
      ? ['One move taken back.', 'Just one slip.']
      : [`${misses} moves taken back.`, `${misses} slips along the way.`],
  takeBack: 'Take back',
  again: 'Start over',
  reveal: 'Solution',
  computer: 'Vs computer',
  failed: 'The opening explorer isn’t answering.',
  modes: modesEn,
  ideas: EN_IDEAS,
  page: {
    home: homeEn,
    title: 'Opening training',
    back: 'Other opening',
    pick: 'Pick an opening',
    pickWhy: 'Pick a line or play a few moves, then start. I’ll answer from the book!',
    youPlay: 'You play',
    sides: { white: 'White', black: 'Black' },
    bookLabel: 'Moves from',
    books: { masters: 'Masters', lichess: 'Lichess', player: 'My games' },
    linesLabel: 'Lines',
    lines: { main: 'Main lines', all: 'All lines' },
    lengthLabel: 'Line length',
    length: moves => (moves === 0 ? 'All' : String(moves)),
    movesSum: moves => (moves === 0 ? 'Every move' : `${moves} moves`),
    toReview: count => `To review (${count})`,
    firstMove: 'Your first move',
    syncLabel: 'Progress',
    syncOn: 'Save it to my Lichess studies',
    synced: 'Saved in your studies',
    syncing: 'Saving…',
    syncFailed: 'Not saved: try again',
    syncOpen: 'Open the study',
    syncStop: 'Stop',
    syncSum: 'Saved',
    record: (found, positions) =>
      `${found}% found at the first try, over ${positions} ${positions === 1 ? 'position' : 'positions'}`,
    fromHere: 'From here',
    search: 'Search for an opening',
    popular: side => `Popular openings for ${sideName(side)}`,
    found: 'Openings found',
    noResult: 'No opening by that name.',
    searchFailed: 'The search isn’t answering.',
    share: percent,
    line: 'Your line',
    kindNames: {
      main: 'Main move',
      popular: 'Popular',
      sideline: 'Sideline',
      rare: 'Rare',
      out: 'Out of book',
    },
    signedOut: 'Sign in to Lichess first: its opening explorer is for members.',
  },
};
