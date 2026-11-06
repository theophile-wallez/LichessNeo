# Packs: your own pieces, board and sounds

The extension shows its own blue board and Lichess's pieces and sounds, until
you pick others in the user menu's Board, Piece set and Sound panels: the
**Extension** tab has the extension's own, the **Packs** tab yours, the
**Lichess** tab Lichess's (the settings' Board & sounds cards keep them apart
the same way). The extension's own are its blue board, the custom board you color
and may give a texture, its material boards (a **Wood**, a **Marble** and a
**Miscellaneous** tile: stone, metal, cloth, paper), its backlit boards (one
**Backlit** tile, which opens onto the six of them and how they light up),
its eight piece sets (Mochi, Mellow, Poppy, Bop, Pebble, Loop, Fold and
Bitty), its **Ascent** sound set, played live, with where it puts each move's
sound, and its **Boxwood** set, wooden pieces recorded on a board, several
takes of each sound. A pack replaces any of the three with yours: a folder on GitHub
holding a `pack.json` and the files it names. A pack may hold several boards,
piece sets and sound sets: see [Several of each](#several-of-each).

To import one, open the extension's settings (your account's settings, then
**Lichess Neo**, or **Import** in a panel's Packs tab), paste the
link to the pack's folder under **Packs** and press **Import**. Signed out,
the account's settings are out of reach: the form is in each panel's Packs tab
of the user menu instead. The extension
downloads every file once and keeps them in the browser; it asks GitHub for
nothing after that. An import shows every part the pack has; then each part is
picked on its own: a pack's pieces with Lichess's board, say. The settings also
list your packs, the newest first, each with the repository it came from (or
**Local zip**); **Update** downloads one from GitHub again, in its latest
version, and **Remove** takes it out. A pack from a private repository is
updated by importing it again with its token, which isn't kept.

The [example pack](../packs/example) uses every field. Copy it to start, or
try it first: [warm-wood.zip](../packs/warm-wood.zip) is the same pack, to drop
on the settings' **Import a local pack (.zip)**, or to unzip and drop a
part at a time.

## From your computer

To try a theme, no pack is needed: under the **Packs** card's link field,
drop the files on the zone of their kind, or click it. A dialog opens, with
each file in its place when its name says which; fill in the rest a file at a
time, by a click on its slot or by dragging a file onto it. Give it a name,
which it needs, and import it: it's listed on its own, in the row of its
kind, the newest first, and picked at once. A click on its tile picks it
again later (a sound set's tile is a player too, whose button plays its
sounds one after the other); **Edit** opens it in the dialog again, to change some of its
files or its name. Each zone links to
[samples](../packs/samples/README.md) of its kind, in every format it takes:

- **Pieces:** all twelve. Those named `wK`, `wQ`, `wR`, `wB`, `wN`, `wP`,
  `bK` … `bP` (in any case, so `wk.png` works), `white-king`,
  `black-pawn`…, or as Wikimedia Commons names them (`Chess_klt45.svg`) go
  in their square on their own.
- **Board:** an image, as `board.image` below. The coordinates take its
  squares' colors.
- **Sounds:** any of those in the table below. Those named after what they
  play (`move-self.mp3`, `capture.wav`…; `move`, `check`, `castling`,
  `promotion`, `lowtime` and `genericnotify` work too) go in their row on
  their own.

Images are SVG, PNG, JPEG, WebP, GIF or AVIF, sounds MP3, Ogg or WAV. Dropped
at once, a folder of pieces or of sounds opens a dialog of its own, and so
does each board. Imported under the name of one you have, of the same kind,
an item takes its place, and a sound set keeps the sounds it isn't given
again, so a theme can be tried and changed. A zip dropped on a zone is read
as its files; one with a `pack.json`, dropped there or on **Import a
local pack**, is imported whole and replaces the pack of its name. The
files are checked as a pack's are (see [Files](#files)).

**Make a pack to share**, at the bottom of the card, puts a pack together
from any boards, piece sets and sound sets you have, yours or a GitHub
pack's: pick them, name the pack, and **Export** saves it as a zip, its
`pack.json` and its files, named as the GitHub repository to share it from
(`LichessNeoPack_WarmWood.zip` for "Warm wood"). Share it as it is, to be
imported in the same way, or on GitHub by its link: see
[Sharing a pack](#sharing-a-pack).

## Sharing a pack

A pack anyone can find is a GitHub repository of its own:

1. Name it `LichessNeoPack_` and the pack's name, in one word
   (`LichessNeoPack_WarmWood`): the composer's zip already has that name.
2. Put the pack at its root, `pack.json` and its files (unzip the composer's
   zip there), so the repository's link alone imports it:
   `https://github.com/<you>/LichessNeoPack_WarmWood`.
3. Give it the topic `lichess-neo-pack` (the gear beside **About**, on the
   repository's page).

Packs shared that way are listed by
[their topic](https://github.com/topics/lichess-neo-pack) and by
[a search for the prefix](https://github.com/search?q=LichessNeoPack_+in%3Aname&type=repositories&s=stars&o=desc),
the most starred first: star the ones you like. Any repository's link still
imports, named so or not, and so does a pack in a folder of a larger one.

## The links that work

Any of these, to a public repository or a private one (see below):

| Link                                                                           | The pack's folder        |
| ------------------------------------------------------------------------------ | ------------------------ |
| `https://github.com/<owner>/<repo>`                                            | the root, default branch |
| `https://github.com/<owner>/<repo>/tree/<branch>/<folder>`                     | `<folder>` on `<branch>` |
| `https://github.com/<owner>/<repo>/blob/<branch>/<folder>/pack.json`           | `<folder>` on `<branch>` |
| `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<folder>/pack.json` | `<folder>` on `<branch>` |

`<branch>` may also be a tag or a commit, but not a branch with a `/` in its
name. Importing the same link again replaces the pack with its new files: a
board, piece set or sound set it no longer lists is removed.

### A private repository

GitHub serves a private repository's files only with a token. Make a
[fine-grained token](https://github.com/settings/personal-access-tokens/new)
for that repository alone, with **Contents: Read-only**, and paste it under
**Private repository?** before importing. The extension sends it to GitHub's
API for that import only and never keeps it; the pack's files are kept, so it
isn't needed again until you import the pack anew. The field is in Lichess's
page, like the rest of the settings: a token that can do nothing but read that
repository keeps the risk to that.

## pack.json

```json
{
  "name": "Warm wood",
  "pieces": "pieces/{piece}.svg",
  "board": { "image": "board.svg", "light": "#f2e4cc", "dark": "#c4936a" },
  "sounds": {
    "move-self": "sounds/move-self.wav",
    "capture": "sounds/capture.wav"
  }
}
```

| Field                       | What it is                                                                                                                                                                                                                              |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                      | The pack's name in the menu, 1 to 40 characters. Required.                                                                                                                                                                              |
| `pieces`                    | The path of the twelve piece images, with `{piece}` for each one's name: `wK`, `wQ`, `wR`, `wB`, `wN`, `wP`, `bK` … `bP`, as Lichess names its own (a copy of a folder of lila's `public/piece` works as is). All twelve must be there. |
| `board.image`               | The board: one image of all 64 squares, white's side at the bottom, `a8` top left.                                                                                                                                                      |
| `board.light`, `board.dark` | The squares' colors, as `#rrggbb`, for the coordinates drawn on them. Optional, but both or neither: without them the coordinates keep Lichess's colors.                                                                                |
| `sounds`                    | Any of the sounds below, each a path. A sound the pack lacks is Lichess's.                                                                                                                                                              |

A pack needs at least one of `pieces`, `board` and `sounds` (with a sound in
it). Paths are relative to the folder of `pack.json` and can't leave it.

The sounds:

| Name                  | Played on                                 |
| --------------------- | ----------------------------------------- |
| `move-self`           | your move, or a move on the side you play |
| `move-opponent`       | the other side's move                     |
| `move-check`          | a move that gives check                   |
| `move-slide`          | a long move: see below                    |
| `move-slide-check`    | a long move that gives check              |
| `move-knight`         | a knight's move                           |
| `capture`             | a capture                                 |
| `capture-check`       | a capture that gives check                |
| `capture-slide`       | a capture at the end of a long move       |
| `capture-slide-check` | the same, giving check                    |
| `castle`              | castling                                  |
| `promote`             | a promotion                               |
| `capture-promote`     | a promotion that captures                 |
| `checkmate`           | after a move that mates: see below        |
| `premove`             | a premove set                             |
| `illegal`             | a move the board refuses                  |
| `notify`              | a challenge, a message, a confirmation    |
| `tenseconds`          | low time                                  |
| `game-start`          | the start of a game                       |
| `game-end`            | the end of a game                         |

A long move is a bishop, rook or queen going two squares or more, or a
pawn's double step. It plays `move-slide` (or `capture-slide`) in place of
the move's or the capture's sound, if the pack has it; a knight's move, which
jumps, plays `move-knight`. A check plays `move-check`, or the sound of its
whole gesture when the pack has it: `capture-check`, `move-slide-check` or
`capture-slide-check`. A promotion that captures plays `capture-promote`,
checking or not, if the pack has it. A mate plays its move's sound, then
`checkmate` just after it, in place of Lichess's victory or defeat.

### Several of each

`board`, `pieces` and `sounds` may each be a list, of boards, piece sets or
sound sets, each with a `name` of its own (1 to 40 characters, a different
one for each of the list):

```json
{
  "name": "Wood",
  "board": [
    { "name": "Light", "image": "light/board.svg", "light": "#f2e4cc", "dark": "#c4936a" },
    { "name": "Dark", "image": "dark/board.png" }
  ],
  "pieces": [
    { "name": "Staunton", "path": "staunton/{piece}.svg" },
    { "name": "Flat", "path": "flat/{piece}.png" }
  ],
  "sounds": [{ "name": "Clicks", "files": { "move-self": "clicks/move.wav" } }]
}
```

A board in a list takes the fields of `board` above, a piece set's `path` is
what `pieces` would be, and a sound set's `files` what `sounds` would be. Each
shows in the menus under its own name, picked like any other; once imported,
the first of each list is shown. A part may be a list while another is one
value, which then goes by the pack's name. The settings list the pack once,
with what it holds, and remove it whole.

## Files

- **Images:** SVG, PNG, WebP, JPEG, GIF or AVIF. The pieces are drawn square,
  so give them a square canvas; 128px or more, or SVG, stays sharp.
- **Sounds:** MP3, Ogg or WAV, short.
- **Sizes:** `pack.json` up to 64 KB, each file up to 2 MB, and each board,
  piece set or sound set up to 16 MB (a pack's lone ones, together). A pack
  may hold as many as you like: its files are downloaded one by one.

The extension tells what a file is from its first bytes, not its name, and
turns down anything else. Each image must also draw: Lichess draws no board
at all when one of its pieces fails to.

## Licenses

Share only what you may share: your own work, or work whose license lets
you. Lichess lists its piece sets, boards and sounds with their licenses in
[lila's COPYING.md](https://github.com/lichess-org/lila/blob/master/COPYING.md);
some are free to copy, others are not.
