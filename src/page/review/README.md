# Game Review

On a game's analysis page, a summary of the game, then a move-by-move review
with a coach; on the free analysis board (`/analysis`), the same coach judging
each move as it's played, and a page of opening practice (see
[Opening practice](#opening-practice)). Lichess's analysis controller is reached through
`#page/lichess/analysis.ts`, a typed facade over `site.analysis`.

## The domain

What the review knows, judges and says, apart from what it shows. Everything
here is pure but the engine wrapper (`engine/stockfish.ts`), and none of it
reads the page: the UI passes in the game id, the coach, the language, the
opening's name and the page's asset URL.

| Folder        | What it holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chess/`      | `uciToSan` (the original's notation, for the judge's `bestSan`), `sanOf` (the coach's: checks marked, `Rfd1` told apart), `normalizeUci` (Lichess's king-takes-rook castling in the engine's terms), `boardAfter`, `lineMoves` (an engine line, move by move), `playLine` (one played out on the board), `lineMotif` (the tactic a line wins by, past the trades: `line-win.ts`), piece values, `isHanging`, `isSacrifice`, `mateInOne` (read off the board alone)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `evaluation/` | `PositionRecord` (a position's evaluation from White's view), `StoredRecordCodec` (the cache's format), win probability, move accuracy, `formatEval`, `barLabel`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `engine/`     | `Stockfish` (Lichess's build, one thread), `EnginePool`, `uciPosition`, UCI parsing, `toRecord`, cloud's answers (`CloudEvalSchema`, `fromCloud`), search limits (the game over's)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `classes/`    | The move classes (`MoveClass`), their colors, sets (`GOOD`, `GRAPH_DOTS`…), ranks, coach moods and icons (`classSvg`, `classImage`, `classIcon`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `judge/`      | `judge` (one move, from its two positions' records), `mateVerdict`, `SURE_MATE`, the summary's `playerAccuracy`, `classCounts` and `nextOfClass`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `rating/`     | The Game Rating: `model.json` (written by `tools/game-rating/fit.py`), Lichess's `divide`, `isTactical`, the odds, `rateGame`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `coach/`      | The coach's words: `remark`, `trajectory`, `fact`, `explanation`, seeded by `CoachContext`; the facts read off the engine's lines (`line-facts.ts`: material won once the trades are over, `swing.ts`), the threats around a move (`threat.ts`, `threat-facts.ts`), a capture or a trade (`capture-fact.ts`, a piece named by its square when its side has more than one like it: `which-one.ts`), a sacrifice whose taker is pinned (`pinned-take.ts`), the better move and what it did (a threat of mate and a piece at once: `double-threat.ts`), or what a miss let go (`best-fact.ts`), an error's (`error-fact.ts`), a quiet move's plan (`plan.ts`, read off the pawns and the pieces' pressure: `structure.ts`, `pressure.ts`, `safety.ts`; a discovered attack, `discovery.ts`; a battery, `battery.ts`; the rule of the square and the opposition, `pawn-square.ts`, `opposition.ts`), and what the coach draws of it on the board (`drawing.ts`, `tactic-marks.ts`; a rook's file or rank and a passed pawn's road as a run, the level slider's knob out from the piece, `page/board/run.ts`) |
| `comment/`    | The comment's `[[…]]` tokens, `commentMarkup` (the typing's words at a given moment), `streamFor`, `verdictTitle`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `i18n/`       | `ReviewLanguage`: every string, sentence and grammar rule, in `en` and `fr`; `pageLanguage()` picks one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## The main types

- `PositionRecord`: `{ cp | mate, whiteWinChance, secondLineWinChance, best,
  line? }`, White's view, `line` the engine's first `LINE_PLIES` moves;
  `toRecord` makes one from an `EngineResult` (the engine's, or `fromCloud`'s).
  The cache stores them under the original's short keys (`wp`, `wp2`, and
  `pv`, the line, ours): `StoredRecordCodec` reads and writes that format.
- `JudgeInput` → `judge` → `MoveVerdict`: the class (`moveClass`), the win
  probability lost (`loss`), `accuracy`, the engine's `best` / `bestSan`, both
  records, both positions and the opponent's `previousMove`. Judge a game's
  moves in order, each with the one before; to relink a move to a later-judged
  previous move, spread it (`{ ...move, previousMove }`): a review is
  immutable. The UI's `JudgedMove` (`session.ts`) is one that may also name
  its opening.
- `GameRatingInput` → `rateGame` → `GameRating`: per color, `{ elo, phases }`,
  or null for a player without a move. The summary shows the phases' verdicts
  as move classes (`view/summary-phases.ts`).
- `CoachContext` (`gameId`, `coach`, `language`) → `explanation(move, context,
  { opening, threats, turning })` → `CommentPart[]`: sentences, the droppable
  ones going when the bubble lacks room, the details (a fact's line and
  squares, its plain sentence said first) last and dim. Half the quiet good
  moves of a game give the coach no fact to say (it reads them through
  `planOf`), and a remark alone says nothing of the position: those get the
  engine's own line from there as a dim detail, its moves playable on the board
  (`continuesLine`, `coach/line-facts.ts`), which is dropped first of all. The game's course is said only when
  the advantage changes (for a move that punishes an error, only when it goes
  past what the error gave), and `turning` marks the error the game turned on
  (`turningMove` of the key moments), which says so. The languages give each
  sentence several ways to be said, and the coach picks one per move (`oneOf`,
  `coach/said.ts`); the opponent's moves have remarks of their own
  (`language.remarks(mover)`). `threats` are the engine's searches of the
  positions around the move with the other side to move (a null move), which
  the UI makes for the move shown and the next two, then, once the game is
  analysed, for all of its moves (`explain/threats.ts`); the coach thinks until
  its move's are in, so a comment says the same every time. A quiet move is
  read for the threat it stops or makes, not one whose piece the reply takes
  (that's a trade), nor a piece attacked that the reply moves away (its plan
  says it's chased), nor a capture the reply still makes; a capture, a check
  or a promotion for a mate only, and what stopping one gives up
  (`coach/threat-facts.ts`).
- `StreamState` (`key`, `shown`, `dropped`): the typing's progress, kept by
  the UI. `streamFor(state, parts)` starts it over for a new comment;
  `commentMarkup(parts, { stream, assets, language })` draws the words.

`variants.ts` names the variants the review judges. The game page's
game over (`src/page/game-over`) reuses the engine and `buildReview` for a
quick, uncached look at the player's moves, then runs the review's own
analysis there (`game-over/precompute.ts`), so the review opens complete.

## The UI

`index.ts` waits for the controller, `start.ts` wires the review up. One
`Session` (`session.ts`) holds what a page keeps: the view's state, the game's
analysis as it comes in (`GameWork`), the moves judged as they're played
(`LiveState`), the coach, the typing and the engines, which the game and the
moves played off it share (`engine-pool.ts`). Only `start.ts`, which builds the
session, calls the render directly; every other module goes through
`session.redraw` and `session.setMode`, which keeps the imports acyclic.

| Folder      | What it holds                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `game/`     | The game's analysis: its export (opening, server analysis), the cache, the cloud, the engine's queue (`nextJob`), and `buildReview`, which judges the moves whose positions are in and drafts the rest                                                                                                                                                                                                    |
| `live/`     | Moves played on the board (the free board's, and those off a game): `judgeAt`, `bookAt`, `openingAt`, and the queue of engine and masters lookups (`pump`)                                                                                                                                                                                                                                                |
| `explain/`  | Explain's lines: the engine's best line from a move that wasn't best, and the one punishing an error, the records' own when they kept one, else each searched from its first move when Explain asks (`pumpLines`, `explainLines`); and the threats the coach reads, searched quickly for the move shown and the next two, then for the whole game (`pumpThreats`), and kept with the game (`seedThreats`) |
| `practice/` | Opening practice: the books it plays from (the explorer's, a study's chapter, the repertoire, a trap), whether it takes a move (`verdict.ts`), where it stands with the board (`status.ts`), the repertoire and its reviews, the user's days and records, the rounds of its modes, and the copy in the user's studies (`sync.ts`)                                                                         |
| `view/`     | The DOM: the tabs over a game's modes, the panel per mode (summary, moves, closed, its card folding down to its chevron, live), the graph, the eval bar, the badge and arrows on the board, the move list's badges, the opening's name, the coach's avatar, the typing, the tooltip, the clicks                                                                                                           |

A game's three modes are tabs at the head of the right-hand column, side by
side: the summary, the debrief move by move and Lichess's own panel ("Moves",
`view/mode-tabs.ts`). The page opens on the summary, or on the debrief from a
link to a move; a step of the board from the summary goes on to the debrief,
which its tab slides to. The summary's button starts the debrief, or resumes
it where the board stands.

Once every move is judged at full depth, the summary's counts are buttons:
one goes to the player's next move of its class after the one on the board,
round to the first again (`view/class-jump.ts`).

Explain swaps the coach's comment for a book move's opening, or for the
engine's lines around a move that wasn't best (`view/explain-hint.ts`); its
button plays the best line on the board as a variation, while the coach still
speaks of the move it stands for (`lineShown`, `view/navigation.ts`).
Explain, Best and Retry fold away on a move they'd have nothing to add to, and
Next grows into their room: their buttons are kept across the panel's renders
so that they ease (`view/nav.ts`). Retry, on an error, has the player look for
a better move on the board, and lights up while they do (`view/retry.ts`).

Under an error's comment, Retry has the player look for a better move on the
board (`view/retry.ts`), where the board can play moves: it takes the board
back before the error and reads what's played from there. The engine's move is
found, and so is any move it no longer judges an error, as an error often has
more than one answer; the game's own move again, or a move no better, is a
miss, taken back two seconds later for another try. The answer is never played
in the player's place, however many misses: the player asks for help, a step at
a time (`view/retry-hint.ts`). The first hint names the piece that has to move
and not its square, the second gives the square and rings it on the board, and
"Show the answer" plays the move. A move played off the game is judged from the
live engine's records (`judgeAt`), so a verdict waits for them: until then the
coach says it's looking. The bubble says where the retry stands
(`view/retry-bubble.ts`), typed out as a comment is, a hint asked for adding
only its own line (`streamOn`, `comment/markup.ts`), Explain and Best fold away so as not to give the
answer, and Next goes on with the game (`view/clicks.ts`).

Before the first move, the coach's brief names the game's opening, its key
moments and, as a button that goes to it, the move the game turned on
(`view/brief.ts`). The move-by-move review then shows the game's opening and
its ECO code over the move list, from the export (`view/opening.ts`). The list
hides Lichess's comments and computer lines but keeps the user's variations,
a computer line they stepped into among them (`view/move-list.ts`), and judges
only those: a game's computer lines can run to hundreds of moves, which the
engine would otherwise search one by one (`live/queue.ts`). The
review counts a game's positions from 0, where Lichess counts a game from a
position from its FEN's move, and grows its mainline with the moves played past
the game's end: a node's index in the game is read off the review's own nodes
(`gameIndex`, `game/work.ts`), never its `ply` nor `onMainline`, and the review
jumps by the path to its node (`gamePath`), never `jumpToMain`. A move past the
end is judged like a variation's.

The move-by-move graph has two views, the advantage and, for a game with
clocks, each move's time as a column (`view/graph-views.ts`,
`view/graph-times.ts`): the toggle over its corner is kept across renders so
that its pick slides. The share button beside the tabs opens Lichess's crosstable
and "Share & export" over the panel (`ln-ext-review-sheet`,
`styles/review/sheet.css`); changing modes closes them.

A click on the coach opens the coach picker. It's a dialog of the content
script (`content/coach/picker.ts`), which has the coaches' names: the page
asks for it (`postCoachPicker`) and hears back the coach picked, already
kept for every page (`onCoachPicked`, `watchCoachPicks`), whose words the
comment is typed in again.

The game's analysis runs on the page's engines (`engine-pool.ts`): up to
three, on one thread each, as the device's cores and memory allow, each on a
position of its own (`nextJob`), on Lichess's relaxed SIMD build where the
browser runs it (`engine/relaxed-simd.ts`), a quarter faster. A position whose
engine stops answering goes to another, and once the analysis is complete all
engines but one are ended (a review read whole from the cache boots only one).
A pool that lost every engine is booted again; one that failed to boot stays
failed.
On the analysis page it waits in a hidden tab and while "Learn from your
mistakes" runs (`game/wait.ts`). Its core (`game/analyse-records.ts`) needs
only the game's id, positions and variant (`RecordsRun`, `game/records.ts`):
the analysis page adds the export, the draft and the move on the board first
(`game/analyse-game.ts`); the game page, once the game is over, runs it at
full depth only and ends its engines when done, or as soon as the tab is
hidden (the review takes up the progress saved). Its records are saved as they
come in (`ln-ext-review-progress:*`), then under the finished game's key
(`ln-ext-review:*`); an index (`ln-ext-review-index`) keeps the 200 games analysed
last, on either page, and drops the others (`game/cache.ts`), and those of an
older `CACHE_VERSION`, which are analysed again (3: the records' lines run
12 moves). The threats searched around a game's positions are kept beside it
(`ln-ext-review-threats:*`, only those the coach can say something of), and
dropped with it, or once a page when of an older version: no index lists them.

The engine never scores the position it searches as a draw by repetition, nor
counts the fifty moves: a game that ends drawn by rule has its last position
set level (`game/draws.ts`), or the move that draws would cost a won game.

The summary's "Learn from your mistakes" hands over to Lichess's own
exercise (`view/learn.ts`): it asks for the server analysis the exercise needs
through Lichess's hidden form, turns the exercise on and closes the review, as
it runs in Lichess's tools. Starting the move-by-move review turns it off
(`closeTools`). The button shows only when the exercise can start (the game
has a server analysis, or Lichess offers to make one: not for a game of 4
moves or fewer), with Lichess's own label.

`render.ts` runs every 150 ms, and after each jump of the board
(`page/lichess/jumps.ts`): the board's marks at once, the panel once the
frame that shows the move is drawn (`renderJump`). It draws the panel again only when what it
shows changes (`render-key.ts`), and then only the parts whose markup changed
(`view/nav.ts`), keeping the buttons and scroll positions as they were; a move
of the board moves the graph's cursor, drawing nothing else of it. Then the
board's marks.

## Opening practice

The free board under `#ln-ext-practice` (`#shared/practice-page.ts`, linked
from the sidebar's Learn section and from each opening's page) is the review's
`openings` mode: a page of the user's openings, then lines played on the board
against a book, the coach answering each move in its card
(`view/openings-page.ts`, `view/practice.ts`). The book is the explorer's
games, as Lichess looks the board's positions up, in the database its tabs
pick, the replies picked as often as they're played (`practice/book.ts`); or a
book of the line's own (`practice/book-tree.ts`): a chapter of the user's
studies, their repertoire, a trap.

A move is taken when the book plays it, unless it's rare there or the engine
finds it worse than the book's main move; where the user's repertoire has a
move, that one; and another good move asks whether to make it theirs
(`practice/verdict.ts`). A move refused is taken back for another try, with the
why (`view/practice-why.ts`) and the opening's plan (`i18n/*-ideas.ts`), and
hints as Retry gives them. Everything is read off the board each time
(`practice/status.ts`), so taking moves back or stepping through them just
works.

Each position the user moved from is kept, per side, with the moves found
there and how it went (`practice/repertoire.ts`), and comes back in the daily
review, at once after a miss and further apart each time it's found at the first
try (1, 3, 7, 14, 30, 60, 120 days). The same records give each opening's
mastery (`practice/mastery.ts`), its rings on the page, and with the moves a
day, the daily goal and its streak (`practice/progress.ts`). The modes are
rounds of cards one after the other (`practice/rounds.ts`): the review, a
minute's challenge, traps from Lichess's puzzles of the opening, played early
(`practice/traps.ts`), and drills on the user's own games, where their habit
isn't their repertoire's or the masters' move (`practice/games.ts`); the quiz
names an opening's position among four. Lines grow longer as an opening is
learned (`practice/settings.ts`), Lichess's players are picked at the user's
level (`practice/player.ts`), and the repertoire's page lists its lines as a
tree, to star or prune (`practice/repertoire-tree.ts`).

When the user turns it on, the repertoire keeps a copy in two private studies
of theirs, one per side, so it follows their account (`practice/sync.ts`): read
once a visit and merged, each position as it was last played, and written back
chapter by chapter, its records in our comments (`practice/chapters.ts`).
Creating the studies takes Lichess's consent page once
(`practice/sync-connect.ts`). See [AGENTS.md](AGENTS.md) for the routes'
quirks.

## Tests

Besides each folder's unit tests, `golden/` drives the review through
scripts of steps on a fake analysis page (`fixtures/review-script.ts`,
`fixtures/review-scenarios.ts`: a fake controller, move list and Stockfish,
fake timers) and checks that after each step it shows exactly what the
original script showed (`golden/fixtures/legacy-*.json`), but for the
deliberate changes since, written into the recordings. One scenario per
test file: a started review can't be stopped, so each needs its own window.
The coach's tests judge a move from a FEN and the engine's records, or from
two positions of a real game and its lines there (`fixtures/played.ts`).
