# Pages

Where each page the sidebar lists stands in the redesign, plus the ones a
profile leads to, and what each needs next. Update a page's row in the same
change that moves it.

## Levels

| Level          | What it means                                                                                   |
| -------------- | ----------------------------------------------------------------------------------------------- |
| 1 · Repainted  | Lichess's own layout in our colors: its forms, its fonts, no title tile, nothing of ours on top |
| 2 · Redesigned | our layout and parts: pinned title with its tile, cards, pills, Hugeicons, side menu with tiles |
| 3 · Signature  | a living piece at the computer level slider's bar: a mascot, a glowing track, one strong number |

The level slider (`styles/pages/level-slider.css`) is the reference for 3: a
mascot that answers what the user does, a well with a glowing fill, sparkles
and a white knob, and a single big number in the state's color.

## Play

| Page              | Path          | Level | Next                                                                                                                     |
| ----------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------ |
| Home              | `/`           | 2     | the lobby's table is still Lichess's rows; the speed cards could take the track for the day's rating                     |
| Computer setup    | `/#ai`        | 3     | the reference                                                                                                            |
| Game setup        | `/#hook`      | 2     | tiles for the variant, the time control and the side over Lichess's controls, a bottom sheet on phones; no signature yet |
| Game, playing     | `/game/<id>`  | –     | not audited yet                                                                                                          |
| Game over         | `/game/<id>`  | 2     | signature planned: the rating's change on the track, toward the next hundred                                             |
| Arena tournaments | `/tournament` | 2     | the leaderboard beside the schedule is a plain list; a tournament's page is still Lichess's on a desktop                 |
| Swiss tournaments | `/swiss`      | 2     |                                                                                                                          |
| Simuls            | `/simul`      | 2     | sets the tone for 2; a simul's page is still Lichess's on a desktop                                                      |

## Puzzles

| Page             | Path                  | Level | Next                                                                                                                                                    |
| ---------------- | --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Puzzles          | `/training`           | 2     | a solved puzzle has no moment of its own; the rating's change could; below 1020px, one column with the coach's card, two on a tablet on its side        |
| Puzzle themes    | `/training/themes`    | 2     |                                                                                                                                                         |
| Puzzle dashboard | `/training/dashboard` | 3     | the numbers, a live coach's tips, every theme against its level; the improvement areas and strengths lead with their first theme and its mascot         |
| Puzzle history   | `/training/history`   | 3     | the week's number on the track with a live coach, the puzzles to retry; each session a card with its score, under its day                               |
| Puzzle Streak    | `/streak`             | 2     | the streak's count doesn't show in the panel: a flame and the track, the best streak on it; below 1020px, as puzzles                                    |
| Puzzle Storm     | `/storm`              | 2     | signature planned: the combo on the track, its bonuses as stops; the panel is empty in the middle; below 1020px, one column, the clock beside the title |
| Puzzle Racer     | `/racer`              | 2     | below 1020px, a race in one column, the clock beside the title                                                                                          |

## Learn

| Page             | Path                        | Level | Next                                                                                                                                                                                                              |
| ---------------- | --------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Learn            | `/learn`                    | 2     | a stage's coach says its goal in the review's card; no signature yet; below 1020px, a stage in one column                                                                                                         |
| Practice         | `/practice`                 | 2     | sets the tone for 2                                                                                                                                                                                               |
| Opening training | `/analysis#ln-ext-practice` | 2     | our own page on the free board, linked from dev builds only until it's finished: the coach's card, mastery rings, the daily goal and its streak; signature planned: the day's moves on the track, toward the goal |
| Coordinates      | `/training/coordinate`      | 1     | Lichess's text panel and tabs on a desktop, fitting the window (the settings scroll on their own); a title with its tile, the score on a track; below 1020px, cards and segmented picks                           |
| Studies          | `/study`                    | 2     | below 800px the menu is a strip of links that fades at its edges, as every side menu                                                                                                                              |
| Coaches          | `/coach`                    | 2     | on phones a card has its picture at its side                                                                                                                                                                      |

## Watch

| Page          | Path         | Level | Next                                                                                                                        |
| ------------- | ------------ | ----- | --------------------------------------------------------------------------------------------------------------------------- |
| Broadcasts    | `/broadcast` | 2     | below 800px the search runs across; a broadcast's own page has no signature yet (a live round's games could take the track) |
| TV            | `/tv`        | 2     |                                                                                                                             |
| Current games | `/games`     | 2     | TV's channels, a column on a desktop and pills below; no pinned title with its tile yet                                     |
| Streamers     | `/streamer`  | 2     | below 800px no card around the list, the cards at the page's margins                                                        |
| Videos        | `/video`     | 2     | the tags are a long column of plain pills                                                                                   |

## Community

| Page     | Path               | Level | Next                                                                                                                                        |
| -------- | ------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Players  | `/player`          | 2     |                                                                                                                                             |
| Profile  | `/@/<user>`        | 2     | the medals under the chart; below 1020px one column of cards 12px apart, the ratings a strip that fades at its edges                        |
| Teams    | `/team`            | 1     | one bare card on an empty page: a team card and an empty state with a mascot; a team's page is still Lichess's, without its box below 800px |
| Insights | `/insights/<user>` | 2     | our chart in place of its Chart.js canvas; the table under it says the same thing twice; no signature yet                                   |
| Forum    | `/forum`           | 2     |                                                                                                                                             |
| Blog     | `/blog`            | 2     | below 1020px a post has no card around it                                                                                                   |

## Tools

| Page            | Path                    | Level | Next                                                                                                           |
| --------------- | ----------------------- | ----- | -------------------------------------------------------------------------------------------------------------- |
| Analysis board  | `/analysis`             | 2     | the panel is empty under the coach until a move is played; below 1020px, one column even on a landscape tablet |
| Game review     | `/game/<id>` (finished) | 2     | signature planned: each side's accuracy on the track, in its grade's color; below 1020px, one column           |
| Openings        | `/opening`              | 2     | the popularity chart is still Lichess's Chart.js canvas                                                        |
| Board editor    | `/editor`               | 2     |                                                                                                                |
| Import game     | `/paste`                | 2     | the title with its picture, the form on a card, the file picker as a drop zone; no signature yet               |
| Advanced search | `/games/search`         | 2     | the form on a card, its labels over its fields on phones; the results' game rows are still Lichess's           |

## Account

| Page           | Path                                | Level | Next                                                                                                                                       |
| -------------- | ----------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Preferences    | `/account/preferences`              | 2     | below 640px up to four choices share a row, more go two by two                                                                             |
| Our settings   | `/account/profile#ln-ext-extension` | 2     | six pages in the account's menu, the board's over a preview board; the coach speaks on its stage as on the review's card; no signature yet |
| Page not found | any unknown path                    | 2     | a card with a signpost and the number in the accent's gradient, Lichess's mini-game on a card of its own                                   |

## Seen while auditing

- Puzzles, Streak and Storm: the sidebar's footer wraps, its fifth icon (the
  sound switch) pushing the last one to a second line.
