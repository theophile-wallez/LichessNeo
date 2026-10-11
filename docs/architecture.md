# Architecture and conventions

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

| Module                                         | What it gives                                                                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dom.ts`, `owned-element.ts`, `svg.ts`         | typed lookups, element builders, writes that skip unchanged values, an element of ours kept in a Lichess container                                   |
| `html.ts`                                      | the escaping `html` template and `setHtml`                                                                                                           |
| `protocol.ts`, `dev-check.ts`                  | the messages between the worlds, and with the background worker                                                                                      |
| `json.ts`, `zod.ts`, `guards.ts`               | parsing and validating outside data                                                                                                                  |
| `storage.ts`                                   | every storage key; writes that survive a full or blocked storage, and reads that throw on a blocked one                                              |
| `page-init-data.ts`, `round-init.ts`           | the page's `#page-init-data`, captured before Lichess removes it; a game page's, read for a game just begun                                          |
| `features.ts`, `frame.ts`, `poll.ts`           | starting features, once-per-frame work, waiting for Lichess's globals                                                                                |
| `build-mode.ts`                                | whether this is a dev build, which reloads itself when rebuilt                                                                                       |
| `lang.ts`, `text.ts`, `math.ts`, `geometry.ts` | the page's language, small text and number helpers, points and boxes                                                                                 |
| `chess/`, `chessground.ts`, `piece-glyph.ts`   | chess basics (squares, FEN, piece letters and values, attacks), a board's pieces read from chessground's classes, a piece of ours in the board's set |
| `charts/`, `coach.ts`, `sounds.ts`             | chart pieces, the coach's moods and the stored coach (`pickCoach`), the sounds a pack may have                                                       |
| `packs/`                                       | packs: their `pack.json`, links, files and stored form, the download the worker runs, its messages                                                   |
| `testing/`                                     | helpers only tests import, and the vitest setup filling happy-dom's gaps                                                                             |

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

A feature's folder splits what it does into small modules: pure logic
(parsing, geometry, text, classification) apart from what touches the DOM,
so the logic can be unit-tested without a page.

## Packs

Each of the board, the pieces and the sounds shows one of the extension's
themes (`themes.ts`: our blue board, the default), a pack the user imported
from GitHub (`docs/packs.md`), or Lichess's own. They're picked in the user
menu's own panels, under an Extension and a Lichess tab (`dasher.ts`,
`panel.ts`, `choices.ts`); packs are imported and removed in the extension's
settings (`import-section.ts`, `import-form.ts`), all in `src/content/packs/`:

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
- `apply.ts` names the board in `data-lr-ext-board` (a theme's id, `pack`, or
  none for Lichess's) and writes one stylesheet: a pack's pieces override the
  variables Lichess draws its own from, its board comes as `--lr-ext-board-img`.
  The sounds go to the page world as bytes
  (`lr-ext:sounds`), where `src/page/sounds` puts them in Lichess's player. With
  no pack, Lichess's player is left alone.

## Types

- No `any`, no type assertion (`as`, `<T>x`, `!`): annotate the type, or
  narrow it. A const assertion (`as const`) is fine: it asserts nothing,
  only keeps literals literal. Lint enforces it.
- Data from outside (JSON, `postMessage`, storage, Lichess's API) is parsed
  with a [zod/mini](https://zod.dev/packages/mini) schema, and its type is
  `z.infer` of that schema, never written by hand. Use `parseJson`,
  `readStored` / `readStoredJson`.
- Lichess's live objects (the analysis controller, tree nodes, the sound
  player) must keep their identity, and a zod parse returns a copy: narrow
  them with `createGuard(schema)` instead (`src/shared/guards.ts`). The
  schema still gives the type, and must not rewrite the value (no
  `lenient`, catch, default or coerce): the guard narrows the input, not a
  parsed copy. Describe only the members we use.
- DOM lookups narrow with `instanceof` through `queryOne`, `queryAll` and
  `closestTo` (`src/shared/dom.ts`).
- Import with the `.ts` extension, and `import type` for types only.
- Never import with `../`: reach a file outside your folder through a `#`
  alias (`#shared/…`, `#content/…`, `#page/…`, `#background/…`,
  `#scripts/…` and `#manifest`), declared once in `package.json`'s
  `imports`, which TypeScript, rolldown, vitest and Node all read. `./` is
  for a file in the same folder or a folder below it.

## Code

- **Names say what things are**: `square`, `whiteShare`, `moveTimes`, not
  `sq`, `ws`, `mt`. Single letters only for loop indexes (`i`, `j`, `k`),
  coordinates (`x`, `y`) and type parameters.
- **Comments are short and say why**, the way a colleague would: a Lichess
  quirk, a browser pitfall, a reason a simpler way doesn't work. No comment
  that repeats the code, no essay. One or two lines is the norm; a module
  may open with a few lines on what it's for.
- **Small pieces**: at most 250 lines of code per file and 60 per function,
  four parameters (take an options object beyond that), complexity 15, no
  nested ternaries. Split along what the code does, not by line count.
- **Markup built as text** goes through the `html` tagged template
  (`src/shared/html.ts`): every interpolated value is escaped unless it's
  `html` output itself. `trustedHtml` is for constants only.
- **Never move or remove Lichess's DOM nodes**: it renders with snabbdom,
  which breaks if its nodes move. Add ours (`lr-ext-` prefixed) beside them,
  set attributes, and let CSS rearrange.
- **Write only what changes**: `setData` and `setStyleProperty` skip
  unchanged values, as every write wakes the page's observers. Prefer
  `classList.toggle(name, force)` to `add`, which writes even when the class
  is there.
- Everything of ours (classes, ids, data attributes, CSS variables, storage
  keys, messages) starts with `lr-ext`, `PREFIX` in `src/shared/prefix.ts`.
  Storage keys live in `StorageKey` / `SessionKey`.

## Styles

`src/styles/index.css` imports each page's stylesheet in cascade order; a
stylesheet longer than 400 lines is a folder of partials with its own
`index.css`. The build inlines the imports, byte for byte, into
`content.css`; a release then drops its comments, blank lines and
indentation (`scripts/lib/css-strip.ts`). Content-script CSS loses ties with Lichess's, hence the many
`!important`s; scope every rule to its page (`main.round …`).

Colors follow Lichess's scheme, light under `html.light`, dark otherwise.
`theme/palette.css` writes them: a ramp of neutrals from the page's deepest
background (1) to its strongest text (14) in either scheme, tinted by the
color theme; the hues, deeper on light; the text's color and black at every
strength (`--lr-ext-lift-N`, `--lr-ext-shade-N`). `theme/base.css` names
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

## Tests

- Unit tests sit next to the code (`foo.test.ts`), run by vitest in
  happy-dom. Test the logic through its exports; for the DOM parts, build
  the markup Lichess serves and check what we add.
- Code ported from the original scripts is checked against what they
  produced: `fixtures/legacy*.json` holds outputs recorded from the
  original for representative inputs (see the radar's test).
- End-to-end tests (`tests/e2e`) load `dist/chrome` into Playwright's
  Chromium and drive live lichess.org pages: a dozen smoke tests, one per
  main page, for what happy-dom can't see (Lichess's markup today, the
  layout, both scripts, the engine). CI runs them on every push.

## Commands

| Command                     | What it does                            |
| --------------------------- | --------------------------------------- |
| `pnpm build`                | builds `dist/chrome`, with source maps  |
| `pnpm dev`                  | the same, rebuilt on every change       |
| `pnpm package`              | release builds for every target, zipped |
| `pnpm typecheck`            | `tsc` over each project                 |
| `pnpm lint` / `pnpm format` | oxlint (type-aware) / oxfmt             |
| `pnpm test`                 | unit tests                              |
| `pnpm test:e2e`             | end-to-end tests (build first)          |
| `pnpm test:e2e:fast`        | the same, without the `@slow` ones      |
| `pnpm test:firefox`         | Firefox smoke test (build it first)     |
| `pnpm check`                | everything but the end-to-end tests     |
| `pnpm check:fast`           | the same, tests of changed files only   |
| `pnpm preview`              | builds into the main checkout's `dist`  |
