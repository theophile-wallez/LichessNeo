# Architecture

How the code is built. The rules it follows are in
[AGENTS.md](../AGENTS.md).

## The three scripts

A Lichess tab runs two scripts of ours, in two JavaScript worlds that share
only the DOM and `window.postMessage`. A third runs in the background.

| Script                       | Source                        | Can reach                                             | Can't reach                                         |
| ---------------------------- | ----------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| `content.js` + `content.css` | `src/content/`, `src/styles/` | the extension's files and APIs (`chrome.*`)           | Lichess's objects (`site`, the analysis controller) |
| `page.js`                    | `src/page/`                   | Lichess's objects, its sound player, its translations | the extension's APIs                                |
| `background.js`              | `src/background/`             | the extension's APIs                                  | any page                                            |

`src/shared/` holds what several of them use, and must not touch `chrome.*`:
the page world would crash on it.

| Module                                               | What it gives                                                                                                                                              |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dom.ts`, `owned-element.ts`, `svg.ts`               | typed lookups, element builders, writes that skip unchanged values, an element of ours kept in a Lichess container                                         |
| `html.ts`, `escape.ts`                               | the escaping `html` template and `setHtml`; the escaping alone, for the build's scripts                                                                    |
| `protocol.ts`, `dev-check.ts`                        | the messages between the worlds, and with the background worker                                                                                            |
| `json.ts`, `zod.ts`, `guards.ts`                     | parsing and validating outside data                                                                                                                        |
| `storage.ts`, `prefix.ts`                            | the `ln-ext` prefix and every storage key; writes that survive a full or blocked storage, and reads that throw on a blocked one                            |
| `page-init-data.ts`, `round-init.ts`                 | the page's `#page-init-data`, captured before Lichess removes it; a game page's, read for a game just begun                                                |
| `features.ts`, `frame.ts`, `poll.ts`                 | starting features, once-per-frame work, waiting for Lichess's globals                                                                                      |
| `build-mode.ts`                                      | whether this is a dev build, which reloads itself when rebuilt                                                                                             |
| `lang.ts`, `text.ts`, `math.ts`, `geometry.ts`       | the page's language, small text and number helpers, points and boxes                                                                                       |
| `time-control.ts`, `clock-time.ts`                   | a time control in words, for a "New 10+5" button; a clock's time                                                                                           |
| `player-bar.ts`, `flag.ts`                           | a player as their bar on the game page shows them; the image of a profile's flag                                                                           |
| `avatar.ts`, `own-avatar.ts`, `own-name.ts`          | users' avatars, a coach on a color picked from their name; the signed-in user's own avatar and name                                                        |
| `hugeicons.ts`, `hugeicons-svg.ts`                   | Hugeicons drawn inline, or as files for the stylesheets (`pnpm icons`)                                                                                     |
| `chess/`, `chessground.ts`, `piece-glyph.ts`         | chess basics (squares, FEN, piece letters and values, attacks), a board's pieces read from chessground's classes, a piece of ours in the board's set       |
| `charts/`, `coach.ts`, `coach-voice.ts`, `sounds.ts` | chart pieces, the coach's moods, the stored coach (`pickCoach`) and switches (`coachOptions`), its words typed out as it talks, the sounds a pack may have |
| `packs/`, `backlit.ts`                               | packs: their `pack.json`, links, files and stored form, the download the worker runs, its messages; the backlit boards and their settings                  |
| `chesscom-rating/`                                   | a Lichess rating's Chess.com equivalent, from the study's table, the speed of a rating Lichess shows, its swap in place, and the settings' switch          |
| `testing/`                                           | helpers only tests import, and the vitest setup filling happy-dom's gaps                                                                                   |

Each directory has its own `tsconfig.json`, so a page-world file that names
`chrome` fails to type-check, and the linter says why.

`src/manifest.ts` defines the manifest for every target (Chrome, the Chrome
Web Store, Firefox). `scripts/build.ts` bundles each script with rolldown into
an IIFE, joins the stylesheets, copies `public/` and the bundled packages'
licenses (`scripts/lib/licenses.ts`) and writes the manifest. It builds beside
`dist/<target>/`, then swaps the result in whole: the browser, and its dev
reload, never see a half-written or failed build.

## Features

Each world's `index.ts` lists its features in the order they start. A feature
is a module exporting a `Feature` (`src/shared/features.ts`): a name and a
`start()`. One that throws is logged and the others still start.

Content features that follow the page as Lichess redraws it register a task
with `onEveryTick` (`src/content/sync-loop.ts`): one 250 ms interval runs them
all, in registration order, while the tab shows (a hidden tab catches up as
it shows again). A task must cost next to nothing when there's nothing to do.
What goes in the game setup dialog follows it with `followSetup`
(`src/content/game-setup/redraws.ts`) instead: Lichess draws the dialog as a
click opens it, and anew on some picks, so it syncs on the frames after a
click and on each redraw too, before the browser paints Lichess's own controls.

A feature's folder splits what it does into small modules: pure logic
(parsing, geometry, text, classification) apart from what touches the DOM,
so the logic can be unit-tested without a page.

## Feature folders

`src/content/`, the isolated-world script:

- `packs`: the board, pieces and sounds: our themes, Lichess's or imported
  packs, their pickers, our themes' settings and the settings' import, in the
  pickers when signed out.
- `bootstrap`.
- `layout`: `MARKS`, the `data-ln-ext-has` flags, inset, zoom, controls
  height.
- `game`.
- `analysis`: the players' bars, the eval gauge, the underboard's button, the
  variations drawn as a tree, long runs folded into a pill.
- `puzzle`: the puzzle page's one panel, its menu and coach.
- `learn`: a Learn stage's coach, saying the level's goal and how it ended.
- `pages`.
- `ui`: tooltips, hover card, tab bars, users' avatars, the user's own name
  where Lichess writes it, the interface's Foley sounds behind the settings'
  switch, the copy fields kept out of Chrome's refill on going back.
- `charts`.
- `coach`: the coach's 3D mascots, the coaches' names and the Game Review's
  coach picker.
- `computer`: the computer's robot and the level slider of the computer's
  game setup.
- `game-setup`: the game setup dialog's tiles for the variant, the time
  control and the side, the panels they switch, its height easing as they
  do, and `followSetup`, which syncs a feature as the setup opens and
  redraws.
- `profile`: a profile's medals, from `/api/user`, and on the user's own,
  their avatar's link to the settings'.
- `chesscom-ratings`: with the settings' Chess.com ratings on, every rating
  Lichess writes (`SPOTS`: a game's bars and info, mini games, game lists,
  rating cards and stats pages, hover cards, leaderboards, the lobby, arenas,
  TV) swapped in place for its Chess.com equivalent, the Lichess one in its
  tooltip.
- `puzzle-dashboard`: the puzzle dashboard's overview with its coach's tips,
  its improvement areas and strengths, from `/api/puzzle/dashboard`, and the
  puzzle history's week, puzzles to retry and session cards.
- `dev`: auto-reload.
- `platform`: the extension APIs it uses.
- `settings`: the extension's settings, a section of the account pages whose
  menu gets a link for each of its pages: Personalization (the appearance,
  the coach and its switches: its 3D, its place on the free analysis board,
  and its drawings on the board), Profile customization (the user's own
  avatar, a coach on a color or a picture, and their own name, which only
  their browser shows), Board & sounds (the extension's, the packs' and
  Lichess's, over a preview board that shows a board or a set while its tile
  is hovered), Packs, Quick pairing (the home's cards: a speed's or the
  player's own, changed, moved, taken off or put back to the defaults, and
  cards suggested from their recent games), Interface (its sounds, the game
  intro over a preview of it, the sidebar's rating, or none), Experimental
  (the Chess.com ratings, and the study behind them in a frame), Backup
  (every setting, pick and pack exported to a JSON file, and put back from
  one); kept in `chrome.storage.sync`, but the coach's, the avatar's and the
  name's picks in localStorage, where the page world reads them.
- `colors`: the color themes, one picked for each of Lichess's schemes.
- `sidebar`: the Donate item, its folding to icons, the preferences cog, the
  account's rating, the light / dark switch, the drawer below 1020px.
- `notices`: Lichess's connection status and the server's announcements, as
  stacked toasts.

`src/page/`, the page-world script:

- `motion`.
- `sounds`: `synth`, the Ascent sound set, played live by Foley; a sound's
  takes, one at random, the long moves that slide, and a mate's sound after
  its move.
- `labels`: Lichess's words for what the content script adds, copied onto
  `<html>`.
- `board`: shapes, checkmate, the coach's drawings.
- `backlit`: the backlit boards' light around each move.
- `review`.
- `charts`.
- `game-over`: kings' badges, confetti, the coach's card in the panel.
- `chat`: the chat's lines marked for their bubbles, its game events in the
  page's language.
- `seek`: a game's "New opponent" seeking in place, and the home's cards of
  the player's own.
- `color-scheme`: the settings' scheme pick, saved as Lichess's own.
- `looks`: Lichess's boards, piece sets and sound sets picked in the
  settings, saved as Lichess's own, or shown unsaved while their tile is
  hovered, and the settings' preview board, which plays a short game.
- `lichess/`: typed facades over Lichess's globals.

## Packs

Each of the board, the pieces and the sounds shows one of the extension's
themes (`themes.ts`: our board in the color theme's accent, the default,
two-tone boards in each color theme's accent and those the user saved,
`flat-boards.ts` and `saved-boards.ts`, the one they color, `custom-board.ts`,
the material boards and the backlit ones, each listed as a family under one
tile, `materials.ts` and `family.ts`, and the Ascent and Boxwood sound sets), a
pack the user imported from GitHub (`docs/packs.md`), or Lichess's own. They're picked in the user
menu's own panels, under an Extension and a Lichess tab (`dasher.ts`,
`panel.ts`, `choices.ts`); packs are imported and removed in the extension's
settings (`import-section.ts`, `import-form.ts`), or, signed out, in the
panels themselves, all in `src/content/packs/`:

- `src/shared/packs/download.ts` reads the pack's `pack.json` and files from
  GitHub's raw host, or through its API with a token for a private
  repository, checks what each file is, and turns them into `data:` URLs. It
  runs in the background worker (`src/background/packs.ts`), as Firefox holds
  a content script's requests to the page's CSP; `import.ts` asks for it, then
  checks that each image decodes, which needs a DOM.
- `store.ts` keeps the packs in an IndexedDB database of the page's origin;
  `library.ts` keeps what each part shows in localStorage, so the content
  script knows it at `document_start`, shows a theme or Lichess's at once, and
  hides a part whose pack is picked until it's read, 2 s at most. Only the
  picked packs are read then; the menu and the settings read the others when
  they open.
- `apply.ts` names the board in `data-ln-ext-board` (a theme's id, `pack`, or
  none for Lichess's) and writes one stylesheet: a pack's pieces override the
  variables Lichess draws its own from, its board comes as `--ln-ext-board-img`.
  The sounds go to the page world as bytes
  (`ln-ext:sounds`), where `src/page/sounds` puts them in Lichess's player. With
  no pack, Lichess's player is left alone.
- A theme's settings are rows in its panel (`options.ts`: options,
  `option-row.ts`, sliders, `slider-row.ts`, colors, `color-row.ts`), kept in
  localStorage (`stored-option.ts`). The Ascent set
  comes to the page in the same message, with no file and its placement, and
  `src/page/sounds/synth` plays it through Foley's Web Audio. Boxwood's
  recorded takes (`public/sounds/boxwood`, `#shared/recorded-sounds.ts`) are
  read by the background worker, which no page CSP holds, and come to the page
  as a pack's do, several takes a sound: each time, one at random
  (`page/sounds/takes.ts`), a slide's by how far the piece went
  (`page/sounds/gesture.ts`); a knight's jump and a promotion that captures
  have their own. A backlit board
  puts its settings in `data-ln-ext-backlit` on `<html>`, only while it's
  shown, and `src/page/backlit` lights the keys around each move on a canvas
  of its own, under the pieces, drawing only while something is lit. Their
  keys come in the shape picked (gap and corners, `keyBox` of
  `src/shared/backlit.ts`), drawn as an image on the board and its tiles
  (`backlit-keys.ts`).

A two-tone board may have a texture (`textures.ts`): a grey relief of a
material, drawn by `tools/board-materials/generate.py` into
`public/img/boards`, which `styles/board/pieces.css` lays over the squares'
colors in `hard-light` (mid-grey leaves a color as it is), under a veil of the
same colors that its strength makes see-through. So any colors take any
texture: the custom board picks one and its strength under its colors
(`texture-row.ts`), a saved board keeps them, and a material board is one
texture over the colors it was drawn in. An extension URL can only be written
in the CSS, so each texture is a variable there (`styles/board/textures.css`)
that the content script names.

## Styles

`src/styles/index.css` imports each page's stylesheet in cascade order; a
stylesheet longer than 400 lines is a folder of partials with its own
`index.css`. The build inlines the imports, byte for byte, into
`content.css`; a release then drops its comments, blank lines and
indentation (`scripts/lib/css-strip.ts`). Content-script CSS loses ties
with Lichess's, hence the many `!important`s; scope every rule to its page
(`main.round …`).

Colors follow Lichess's scheme, light under `html.light`, dark otherwise.
`theme/palette.css` writes them: a ramp of neutrals from the page's deepest
background (1) to its strongest text (14) in either scheme, tinted by the
color theme; the hues, deeper on light; the text's color and black at every
strength (`--ln-ext-lift-N`, `--ln-ext-shade-N`). `theme/base.css` names
their roles and points Lichess's `--c-*` variables at them. A color theme
(`src/content/colors`) is a palette per scheme, three variables each:
`apply.ts` writes the picked ones in a stylesheet of ours, from
`document_start`, out of a copy the settings leave in localStorage. The
settings' Appearance card (`src/content/settings/appearance.ts`) picks them,
and the scheme too, which `src/page/color-scheme` saves as Lichess's own
preference, as its Theme menu does. Users make their own in its editor
(`theme-editor.ts`): kept in the settings beside the built-in ones
(`colors/built-in.ts`), checked by the same schema, and shared as a code
(`colors/share.ts`).
