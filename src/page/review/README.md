# Game Review

On a game's analysis page, a summary of the game, then a move-by-move review
with a coach; on the free analysis board (`/analysis`), the same coach judging
each move as it's played. Lichess's analysis controller is reached through
`#page/lichess/analysis.ts`, a typed facade over `site.analysis`.

## The domain

What the review knows, judges and says, apart from what it shows. Everything
here is pure but the engine wrapper (`engine/stockfish.ts`), and none of it
reads the page: the UI passes in the game id, the coach, the language, the
opening's name and the page's asset URL.

| Folder        | What it holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `chess/`      | `uciToSan`, `normalizeUci` (Lichess's king-takes-rook castling in the engine's terms), `lineMoves` (an engine line, move by move), `playLine` (one played out on the board), `lineMotif` (the tactic a line wins by), piece values, `isHanging`, `isSacrifice`, `mateInOne` (read off the board alone)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `evaluation/` | `PositionRecord` (a position's evaluation from White's view), `StoredRecordCodec` (the cache's format), win probability, move accuracy, `formatEval`, `barLabel`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `engine/`     | `Stockfish` (Lichess's build, one thread), `EnginePool`, `uciPosition`, UCI parsing, `toRecord`, cloud's answers (`CloudEvalSchema`, `fromCloud`), search limits (the game over's)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `classes/`    | The move classes (`MoveClass`), their colors, sets (`GOOD`, `GRAPH_DOTS`…), ranks, coach moods and icons (`classSvg`, `classImage`, `classIcon`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `judge/`      | `judge` (one move, from its two positions' records), `mateVerdict`, `SURE_MATE`, the summary's `playerAccuracy`, `classCounts` and `nextOfClass`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `rating/`     | The Game Rating: `model.json` (written by `tools/game-rating/fit.py`), Lichess's `divide`, `isTactical`, the odds, `rateGame`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `coach/`      | The coach's words: `remark`, `trajectory`, `fact`, `explanation`, seeded by `CoachContext`; the facts read off the engine's lines (`line-facts.ts`: material won once the trades are over, `swing.ts`), the threats around a move (`threat.ts`, `threat-facts.ts`), a capture or a trade (`capture-fact.ts`), the better move and what it did (a threat of mate and a piece at once: `double-threat.ts`), or what a miss let go (`best-fact.ts`), an error's (`error-fact.ts`), a quiet move's plan (`plan.ts`, read off the pawns and the pieces' pressure: `structure.ts`, `pressure.ts`, `safety.ts`; a discovered attack, `discovery.ts`; a battery, `battery.ts`; the rule of the square and the opposition, `pawn-square.ts`, `opposition.ts`), and what the coach draws of it on the board (`drawing.ts`, `tactic-marks.ts`) |
| `comment/`    | The comment's `[[…]]` tokens, `commentMarkup` (the typing's words at a given moment), `streamFor`, `verdictTitle`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `i18n/`       | `ReviewLanguage`: every string, sentence and grammar rule, in `en` and `fr`; `pageLanguage()` picks one                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

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
  ones going when the bubble lacks room. The game's course is said only when
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
  (that's a trade); a capture or a check for a mate only,
  and what stopping one gives up (`coach/threat-facts.ts`).
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

| Folder     | What it holds                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `game/`    | The game's analysis: its export (opening, server analysis), the cache, the cloud, the engine's queue (`nextJob`), and `buildReview`, which judges the moves whose positions are in and drafts the rest                                                                                                                                                                                                    |
| `live/`    | Moves played on the board (the free board's, and those off a game): `judgeAt`, `bookAt`, `openingAt`, and the queue of engine and masters lookups (`pump`)                                                                                                                                                                                                                                                |
| `explain/` | Explain's lines: the engine's best line from a move that wasn't best, and the one punishing an error, the records' own when they kept one, else each searched from its first move when Explain asks (`pumpLines`, `explainLines`); and the threats the coach reads, searched quickly for the move shown and the next two, then for the whole game (`pumpThreats`), and kept with the game (`seedThreats`) |
| `view/`    | The DOM: the panel per mode (summary, moves, closed, live), the graph, the eval bar, the badge and arrows on the board, the move list's badges, the opening's name, the coach's avatar, the typing, the tooltip, the clicks                                                                                                                                                                               |

Once every move is judged at full depth, the summary's counts are buttons:
one goes to the player's next move of its class after the one on the board,
round to the first again (`view/class-jump.ts`).

Explain swaps the coach's comment for a book move's opening, or for the
engine's lines around a move that wasn't best (`view/explain-hint.ts`); its
button plays the best line on the board as a variation, while the coach still
speaks of the move it stands for (`lineShown`, `view/navigation.ts`).
Explain and Best fold away on a move they'd have nothing to add to, and Next
grows into their room: their buttons are kept across the panel's renders so
that they ease (`view/nav.ts`).

Before the first move, the coach's brief names the game's opening, its key
moments and, as a button that goes to it, the move the game turned on
(`view/brief.ts`). The move-by-move review then shows the game's opening and
its ECO code over the move list, from the export (`view/opening.ts`). The list
hides Lichess's comments and computer lines but keeps the user's variations,
a computer line they stepped into among them (`view/move-list.ts`).

The move-by-move graph has two views, the advantage and, for a game with
clocks, each move's time as a column (`view/graph-views.ts`,
`view/graph-times.ts`): the toggle over its corner is kept across renders so
that its pick slides. The header's share button opens Lichess's crosstable
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
older `CACHE_VERSION`, which are analysed again (2: the records keep their
lines). The threats searched around a game's positions are kept beside it
(`ln-ext-review-threats:*`, only those the coach can say something of), and
dropped with it.

The summary's "Learn from your mistakes" hands over to Lichess's own
exercise (`view/learn.ts`): it asks for the server analysis the exercise needs
through Lichess's hidden form, turns the exercise on and closes the review, as
it runs in Lichess's tools. Starting the move-by-move review turns it off
(`closeTools`). The button shows only when the exercise can start (the game
has a server analysis, or Lichess offers to make one: not for a game of 4
moves or fewer), with Lichess's own label.

`render.ts` runs every 150 ms, and at once after each jump of the board
(`page/lichess/jumps.ts`): it draws the panel again only when what it
shows changes (`render-key.ts`), and then only the parts whose markup changed
(`view/nav.ts`), keeping the buttons and scroll positions as they were; a move
of the board moves the graph's cursor, drawing nothing else of it. Then the
board's marks.

## Tests

Besides each folder's unit tests, `golden/` drives the review through
scripts of steps on a fake analysis page (`fixtures/review-script.ts`,
`fixtures/review-scenarios.ts`: a fake controller, move list and Stockfish,
fake timers) and checks that after each step it shows exactly what the
original script showed (`golden/fixtures/legacy-*.json`), but for the
deliberate changes since, written into the recordings. One scenario per
test file: a started review can't be stopped, so each needs its own window.
