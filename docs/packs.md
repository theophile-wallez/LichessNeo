# Packs: your own pieces, board and sounds

The extension shows its own blue board and Lichess's pieces and sounds, until
you pick others in the user menu's Board, Piece set and Sound panels: the
**Extension** tab has the extension's own and your packs, the **Lichess** tab
Lichess's. The extension's own are its blue board, the custom board you color
and may give a texture, its material boards (a **Wood**, a **Marble** and a
**Miscellaneous** tile: stone, metal, cloth, paper), its backlit boards (one
**Backlit** tile, which opens onto the six of them and how they light up),
its **Ascent** sound set, played live, with where it puts each move's
sound, and its **Boxwood** set, wooden pieces recorded on a board, several
takes of each sound. A pack replaces any of the three with yours: a folder on GitHub
holding a `pack.json` and the files it names. A pack may hold several boards,
piece sets and sound sets: see [Several of each](#several-of-each).

To import one, open the extension's settings (your account's settings, then
**Lichess Neo**, or **Import** in a panel's Extension tab), paste the
link to the pack's folder under **Packs** and press **Import**. Signed out,
the account's settings are out of reach: the form is in each panel's Extension
tab of the user menu instead. The extension
downloads every file once and keeps them in the browser; it asks GitHub for
nothing after that. An import shows every part the pack has; then each part is
picked on its own: a pack's pieces with Lichess's board, say. The settings also
list your packs, and remove them.

The [example pack](../packs/example) uses every field. Copy it to start.

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
