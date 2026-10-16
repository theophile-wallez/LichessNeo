# Pages

Where each page the sidebar lists stands in the redesign, and what it needs
next. Update a page's row in the same change that moves it.

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
| Game, playing     | `/<id>`       | –     | not audited yet                                                                                                          |
| Game over         | `/<id>`       | 2     | signature planned: the rating's change on the track, toward the next hundred                                             |
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

| Page        | Path                   | Level | Next                                                                                                                             |
| ----------- | ---------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------- |
| Learn       | `/learn`               | 2     | a stage's coach says its goal in the review's card; no signature yet; below 1020px, a stage in one column                        |
| Practice    | `/practice`            | 2     | sets the tone for 2                                                                                                              |
| Coordinates | `/training/coordinate` | 1     | Lichess's text panel and tabs on a desktop; a title with its tile, the score on a track; below 1020px, cards and segmented picks |
| Studies     | `/study`               | 2     |                                                                                                                                  |
| Coaches     | `/coach`               | 2     | on phones a card has its picture at its side                                                                                     |

## Watch

| Page          | Path         | Level | Next                                                                                                  |
| ------------- | ------------ | ----- | ----------------------------------------------------------------------------------------------------- |
| Broadcasts    | `/broadcast` | 2     |                                                                                                       |
| TV            | `/tv`        | 2     |                                                                                                       |
| Current games | `/games`     | 1     | on a desktop its channels are Lichess's list, in capitals: give them TV's column (pills below 1020px) |
| Streamers     | `/streamer`  | 2     |                                                                                                       |
| Videos        | `/video`     | 2     | the tags are a long column of plain pills                                                             |

## Community

| Page    | Path        | Level | Next                                                                         |
| ------- | ----------- | ----- | ---------------------------------------------------------------------------- |
| Players | `/player`   | 2     |                                                                              |
| Profile | `/@/<user>` | 2     | the medals under the chart                                                   |
| Teams   | `/team`     | 1     | one bare card on an empty page: a team card and an empty state with a mascot |
| Forum   | `/forum`    | 2     |                                                                              |
| Blog    | `/blog`     | 2     |                                                                              |

## Tools

| Page            | Path               | Level | Next                                                                                                           |
| --------------- | ------------------ | ----- | -------------------------------------------------------------------------------------------------------------- |
| Analysis board  | `/analysis`        | 2     | the panel is empty under the coach until a move is played; below 1020px, one column even on a landscape tablet |
| Game review     | `/<id>` (finished) | 2     | signature planned: each side's accuracy on the track, in its grade's color; below 1020px, one column           |
| Openings        | `/opening`         | 2     | the popularity chart is still Lichess's Chart.js canvas                                                        |
| Board editor    | `/editor`          | 2     |                                                                                                                |
| Import game     | `/paste`           | 1     | Lichess's form: no title tile, a bare text area, the browser's file picker                                     |
| Advanced search | `/games/search`    | 1     | Lichess's form: no title tile, rows of empty selects                                                           |

## Account

| Page           | Path                                | Level | Next                                                                                 |
| -------------- | ----------------------------------- | ----- | ------------------------------------------------------------------------------------ |
| Preferences    | `/account/preferences`              | 2     |                                                                                      |
| Our settings   | `/account/profile#lr-ext-extension` | 2     | five pages in the account's menu, the board's over a preview board; no signature yet |
| Page not found | any unknown path                    | 1     | Lichess's 404 and its mini-game                                                      |

## Seen while auditing

- Puzzles, Streak and Storm: the sidebar's footer wraps, its fifth icon (the
  sound switch) pushing the last one to a second line.
