# AGENTS.md

Instructions for AI coding agents (and humans) working on Lichess Neo. Read
this file whole before changing anything. The code's design is detailed in
[docs/architecture.md](docs/architecture.md), the Game Review's in
[src/page/review/README.md](src/page/review/README.md).

## The project in brief

- A browser extension (Manifest V3, Chrome and Firefox) that gives
  lichess.org a modern look and feel, plus a Game Review with a coach.
- TypeScript 7, bundled by rolldown (`scripts/build.ts`) into
  `dist/<target>/`. The browser loads the build, never `src/`.
- Two scripts run in each Lichess tab, in two JavaScript worlds that share
  only the DOM and `window.postMessage`: `src/content` (isolated world: the
  extension's APIs and files) and `src/page` (page world: Lichess's own
  objects). `src/shared` serves both and never touches `chrome.*`.
  `src/background` is the service worker. `src/styles` is joined into
  `content.css`.

## The quality bar

This codebase is held to professional standards: every change must read as
if a senior engineer wrote it for code review. It was rewritten once already
because a contributor called it AI-generated and unclean. Don't let it slide
back. `pnpm check` enforces much of what follows; the rest is on you.

**Types**

- Strict TypeScript. Never `any`, never a type assertion (`as`, `<T>x`, `!`;
  `as const` is fine), never `@ts-ignore` or a lint-disable comment.
- Every piece of data from outside (JSON, fetch responses, `postMessage`,
  storage, `#page-init-data`, Lichess's globals) is validated with a
  zod/mini schema (`import { z } from 'zod/mini'`), and its type is
  `z.infer` of that schema, not written by hand. Read it with `parseJson`,
  `readStored` / `readStoredJson`.
- Lichess's live objects keep their identity: narrow them with
  `createGuard(schema)` (`#shared/guards.ts`), not a parse, which copies.
  The schema describes only the members we use and must not rewrite the
  value (no `lenient`, catch, default or coerce).
- DOM lookups narrow with `instanceof` through `queryOne`, `queryAll` and
  `closestTo` (`#shared/dom.ts`).

**Structure**

- One concern per module. Pure logic (parsing, geometry, text, rules) lives
  apart from the code that touches the DOM, so it can be tested alone.
- A feature is a folder under `src/content/` or `src/page/` whose module
  exports a `Feature`, listed in the world's `index.ts` in start order.
  Content features that follow the page register with `onEveryTick`
  (`#content/sync-loop.ts`).
- Code used by more than one feature goes in `src/shared/`; look there
  before writing a helper. Test-only helpers go in `src/shared/testing/`.
- Imports across folders use the `#` aliases of `package.json`'s `imports`
  (`#shared/…`, `#content/…`, `#page/…`, `#background/…`, `#scripts/…`,
  `#manifest`), never `../`. `./` is for the same folder or a folder below
  it. Keep the `.ts` extension, and `import type` for types only.
- At most 250 lines of code per file and 60 per function, 4 parameters (use
  an options object), complexity 15, no nested ternaries. Split by what the
  code does, not to dodge the limit.

**Names and comments**

- Names say what things are: `square`, `whiteShare`, `moveTimes`, never
  `sq`, `ws`, `mt`. One letter only for loop indexes (`i`, `j`, `k`),
  coordinates (`x`, `y`) and type parameters.
- Comments are short and plain, and say why: a Lichess quirk, a browser
  pitfall, a constraint that isn't visible in the code. One or two lines is
  the norm. Never narrate what the code does, never write essays, and never
  use an odd, flowery or "AI" voice. A module may open with a few lines on
  what it's for.

**DOM, performance and security**

- Never move or remove Lichess's DOM nodes (snabbdom breaks). Add our own,
  prefixed `ln-ext`, and rearrange with CSS.
- The content script runs on every page and its tasks every 250 ms: a task
  must cost next to nothing when nothing changed. Write only what changes
  (`setData`, `setStyleProperty`, `classList.toggle(name, force)`), and
  avoid layout reads in hot paths. No endless `requestAnimationFrame` or
  animation loops, no `:has()` in hot places (see the pitfalls).
- Markup built as text goes through the escaping `html` template
  (`#shared/html.ts`); `trustedHtml` is for constants only. A message
  handler checks `event.source === window` and validates with a schema
  (`#shared/protocol.ts` does both).
- Everything of ours is prefixed `ln-ext` (`PREFIX`, `#shared/prefix.ts`):
  classes, ids, data attributes and CSS variables, written out in full;
  storage keys (listed in `StorageKey` / `SessionKey`) and message types,
  built with `prefixed()` and `messageType()`.

**Tests**

- Every change ships with tests, written once the user has validated it (see
  [How a change goes](#how-a-change-goes)). Unit tests sit next to the code
  (`name.test.ts`, vitest in happy-dom): logic through its exports, DOM
  features by building the markup Lichess serves and checking what we add, a
  stylesheet's rule that must beat Lichess's by computing the style under both
  (`styles/game/game-info.test.ts`). `tests/e2e` is a dozen smoke tests on
  lichess.org, one per main page, for what happy-dom can't see (Lichess's
  markup today, the layout, both scripts, the engine). Don't add to it for a
  feature: its unit tests cover it. Never run it locally, nor
  `pnpm test:firefox`: a suite opens browser after browser across its specs
  and viewports, and the machine swaps instead of working. CI runs both, when
  the user starts it (`/ci`). Driving a browser yourself for a one-off check
  is another matter, and stays fine (see
  [Testing on lichess.org](#testing-on-lichessorg)).
- See each new test fail once before trusting it: a test that can't fail is
  not a test. Assert on real outputs, not on a mock's own answers.
- `fixtures/legacy*.json` are outputs recorded from the original code. They
  are the reference for behavior: never regenerate them from the new code.
  If a change must alter one, it's a deliberate behavior change: say so in
  the commit. Compare their fractions through `nearly`
  (`#shared/testing/numbers.ts`): `Math.exp` and `Math.log` differ in the
  last bit between macOS and Linux.
- No fixed real-time sleeps in tests: wait for the thing you need.

**Docs**

- When you change what `AGENTS.md`, `docs/architecture.md`, a README or a
  comment describes, update it in the same change.
- `docs/pages.md` tracks where each page stands in the redesign: when a
  change moves a page, update its row.

## How a change goes

The user judges a change by seeing it in their own Chrome, so that loop
must be short. A change goes in two steps.

1. **Draft, until the user validates it.** Write the change to the quality
   bar above, but no new tests, no Playwright, no viewport sweep. Run
   `pnpm check:fast` (types, lint, format, source rules, and only the unit
   tests of what changed since `origin/main`: seconds, not a minute) and fix
   what it finds, then `pnpm preview --thread <id>`: it builds into the main
   checkout's `dist/chrome`, which Chrome reloads when a Lichess tab next
   gets focus. Rebase onto `origin/main` before each preview, and take your
   turn at it: Chrome shows one draft at a time (see
   [Sessions side by side](#sessions-side-by-side)). Tell the user what
   to look at, and iterate on their feedback. Commit nothing yet.
2. **Finish, once the user says it's good** (or asks to ship). Write the
   tests, then meet the [Definition of done](#definition-of-done) and ship.

A one-line fix the user doesn't need to see (a typo, a doc, a script) can
skip the draft. CI runs the whole suite, end-to-end tests included, but no
push starts it, to spare the Actions minutes: only the user does, by hand on
GitHub or with `/ci` (`.claude/skills/ci`), which runs it on `main` and
releases what passes. Don't start it unasked; its results are looked at
afterwards, not waited for.

## Sessions side by side

The user runs several T3 sessions at once, each in its own worktree, and they
share two things: the preview Chrome loads (the main checkout's
`dist/chrome`) and `main`. A session takes its turn at either with
`pnpm turn` (claims kept in the repository's common git folder, which every
worktree sees), and talks to the others with T3's tools: `t3_thread_list`
gives this session's id (`currentThreadId`) and the others', `t3_thread_read`
a session's worktree and where it stands, `t3_thread_send` a message to it.
Pass your id as `--thread <id>`, so the others know whom to tell.

**Before a preview.** Sessions ship side by side, so `main` moves under a
draft: rebase onto it each time (`git fetch origin && git rebase --autostash
origin/main`), or the preview would undo in Chrome what the others shipped.
`pnpm preview` refuses a worktree behind `origin/main`. If putting the draft
back conflicts, git leaves it in the stash list every worktree shares: apply
it by its SHA, never with a bare `git stash pop`.

Nor does `pnpm preview` replace another session's draft: it names that
session and stops. The user may be judging that draft, so:

- if that session is running, tell it (`t3_thread_send`) that Chrome won't
  show its draft any more and that it must preview again before asking the
  user to look; an idle one needs no message, see the next point. Then run
  `pnpm preview --take --thread <id>`, and tell the user, linking the other
  session, that Chrome shows this draft in its place;
- when the user comes back to a draft, run `pnpm turn` before telling them
  what to look at: if Chrome shows another draft, preview again.

**Before shipping.** Ships go one at a time, in an order the sessions agree
on, since each rebases onto the one before it:

1. Look at the other sessions: `pnpm turn`, then each one of the project
   that isn't settled (`t3_thread_list`): its worktree's commits not on
   `origin/main` and its uncommitted changes (`git -C <worktree> log
   origin/main..HEAD`, `status --short`), and whether the user asked it to
   ship (its last messages).
2. Order the ships that are due:
   - a session that holds the ship turn finishes first;
   - a fix for something broken on `main` goes before the rest;
   - one that's ready (its checks green) goes before one still testing, which
     doesn't hold it up;
   - when two touch the same files, the second rebases onto the first and
     runs `pnpm check` again, and looks again at what the overlap changes;
   - otherwise, in the order the user asked for them.
3. Tell each session concerned its place in a short message, and the user
   the order in your reply.
4. `pnpm turn take ship --thread <id> --wait` waits for your turn (30 minutes
   at most: then look at who holds it, and why). Hold it from the last
   rebase to the main checkout's build (see [Shipping](#shipping)), then
   `pnpm turn release ship`, also when the ship fails, and tell the next
   session in line that it's its turn.

## Definition of done

A change is done, once the user has validated its draft, when all of these
hold:

- [ ] `pnpm check` passes: types, lint, formatting, source rules, unit tests.
- [ ] New or changed behavior is covered by tests you've seen fail without
      the change.
- [ ] User-visible changes are checked live on lichess.org with the built
      extension (`pnpm build`, then Playwright): at the viewports under
      [Testing on lichess.org](#testing-on-lichessorg), with screenshots
      looked at.
- [ ] Docs match the code. No throwaway files are left in the repo.
- [ ] It's shipped (see [Shipping](#shipping)).

## Commands

| Command                         | What it does                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm install`                  | installs the dependencies (Node 24 first, and `corepack enable` for pnpm)        |
| `pnpm build`                    | builds `dist/chrome` with source maps (`--target firefox`, `--release`, `--out`) |
| `pnpm dev`                      | the same, rebuilt on every change                                                |
| `pnpm preview`                  | builds into the main checkout's `dist/chrome`, the one Chrome loads, in turn     |
| `pnpm turn`                     | who holds the preview and the ship turn (`take ship --wait`, `release ship`)     |
| `pnpm playground`               | serves the mascots' playground on localhost:5180, reloaded on every change       |
| `pnpm check`                    | typecheck, lint, format check, source rules, unit tests                          |
| `pnpm check:fast`               | the same, but only the unit tests of files changed since `origin/main`           |
| `pnpm test` / `pnpm test:watch` | unit tests                                                                       |
| `pnpm test:e2e`                 | end-to-end smoke tests on lichess.org (build first), run by CI                   |
| `pnpm test:e2e:fast`            | the same, without the `@slow` ones (the engine's)                                |
| `pnpm test:firefox`             | Firefox smoke test of `dist/firefox` (after `pnpm build --target firefox`)       |
| `pnpm lichess:login`            | signs a kept Chromium profile in to lichess.org, by hand, for signed-in checks   |
| `pnpm lint:fix` / `pnpm format` | fix what oxlint and oxfmt can                                                    |
| `pnpm package`                  | release zips of every target into `dist/`, plus the sources zip                  |
| `pnpm store:render`             | renders the store images and the extension icons from `store/templates`          |
| `pnpm icons`                    | writes `public/img/hugeicons`, the Hugeicons the CSS names                       |
| `/ci`                           | (Claude Code) starts the release of `main`: the CI, then a GitHub release        |
| `/ci-publish`                   | (Claude Code) tags `main` `store-<version>`, which sends it to the stores        |

## Where things go

- `src/manifest.ts`: the manifest of each target, and `BASE_VERSION`.
- `src/content/`: the isolated-world script, a folder per feature.
- `src/page/`: the page-world script, a folder per feature, and `lichess/`,
  typed facades over Lichess's globals.
- `src/shared/`: helpers for both worlds and the worker (DOM, markup,
  messages, storage, chess, charts, packs, a Lichess rating's Chess.com
  equivalent), `testing/` for tests.
- `src/background/`: the service worker: auto-reload, old cache cleanup,
  pack downloads, Boxwood's sounds read for the content script.
- `src/styles/`: one stylesheet per page or part, a folder of partials past
  400 lines, joined in `index.css`'s order.
- `public/`: copied into each build: `_locales/`, `icons/`, `img/` (`icons`,
  `hugeicons`, `sidebar`, `coaches`, `boards`: the board textures), `pages/`
  (the frame of the rating study),
  `sounds/boxwood` (the Boxwood set's takes), beside the bundled packages'
  licenses (`scripts/lib/licenses.ts`).
- `scripts/`: build, package, typecheck, source rules, version, icons, store
  image rendering, store publishing.
- `playground/`: the mascots' playground (`pnpm playground`), a page apart
  from the extension and never bundled into it: each coach and the robot on
  a stage, their colors, skin, fur and moods to change, their moves to play.
- `tests/e2e/`: Playwright smoke tests on lichess.org.
- `tools/`: Python generators, run by hand.
- `packs/`: the example pack users can import (`docs/packs.md` describes the
  format).
- `store/`: the store images (`<lang>/<name>.png`), the pages they and the
  extension icon are rendered from (`templates/`), and the listings' texts
  (`listing.md`).
- `.github/`: CI (`ci.yml`), releases (`release.yml`), Dependabot.

What each feature folder holds is listed in
[docs/architecture.md](docs/architecture.md#feature-folders).

**Recipes**

- _A content feature:_ a folder in `src/content/`, a module exporting a
  `Feature`, an entry in `src/content/index.ts` at the right place in the
  start order, tests beside it, and a line in `docs/architecture.md`'s
  feature folders.
- _A page feature:_ the same in `src/page/`. Read Lichess's objects through
  `src/page/lichess/` (add to its facades rather than reading `window` ad
  hoc).
- _Data between the worlds:_ a schema and a pair of post / listen functions
  in `src/shared/protocol.ts`.
- _A stylesheet:_ a file in `src/styles/`, imported from `index.css` at its
  place in the cascade.
- _A storage key:_ in `StorageKey` or `SessionKey` (`src/shared/storage.ts`).
- _A color:_ a role of `styles/theme/base.css` (`--ln-ext-bg-panel`,
  `--ln-ext-text-dim`…), else the palette's (`styles/theme/palette.css`): a
  neutral step, a hue, `--ln-ext-lift-N` (the text's color at N%: hovers,
  hairlines) or `--ln-ext-shade-N` (shadows, wells). They all follow the
  scheme, so a rule is written once. `#fff` and `#000` only on what stays the
  same on both (a fill of the accent or a hue, a picture, the board), as
  `--ln-ext-white` and `--ln-ext-ink`. Check both schemes.
- _A color theme:_ an entry in `BUILT_IN_THEMES`
  (`src/content/colors/built-in.ts`), a palette (a tint's hue and chroma, an
  accent carrying white text at 3:1) per scheme, and its name in
  `public/_locales`. Users make theirs in the settings' theme editor, kept in
  `customThemes`.
- _A tab bar that slides:_ an entry in `TAB_BARS`
  (`src/content/ui/tab-bars.ts`), then its look in CSS (see "Tabs slide").
- _An image or a sound:_ never a remote URL, and never another chess site's
  (see the product rules). Icons are Hugeicons (see "An icon"); the sidebar's
  are our own drawings, 96px WebP in `img/sidebar`. The build fails on a CSS
  extension URL whose file is missing or not in `web_accessible_resources`.
  Boards and piece sets aren't bundled: they're Lichess's, or a pack's
  (`docs/packs.md`), but for our two-tone boards' textures (see "A board
  texture"); nor are sounds, but for our two sets, Ascent
  (synthesized) and Boxwood (recorded, `public/sounds/boxwood`, cut by
  `tools/boxwood-sounds/cut.py`; the build fails unless its takes are the ones
  `RECORDED_TAKES` counts). A new sound a pack may have goes in
  `src/shared/sounds.ts`.
- _A chart:_ redrawn in SVG from the page's data, in the rating chart's look
  (see "Every chart is modern"), with `src/shared/charts/`.
- _A board texture:_ then its line in `TEXTURES`
  (`content/packs/textures.ts`), its variable in `styles/board/textures.css`,
  and its board in `materials.ts`, in the colors the tool prints. Which tool
  depends on whether there is a real board behind it. **From photographs of
  one** (the nine woods and the Portoro): `upscale.py <folder>
  <photograph>…`, then `photo.py <name> <folder>/*.png`, which needs OpenCV.
  The chequerboard is its own calibration target, so the
  squares are rectified on the corners where four of them meet, each square is
  kept from whichever photograph shows it largest, the photographs are put on
  one scale by the board's own two colors, what is not the board is told from
  it by how far from neutral it runs, in whichever direction (a grey cloth
  under a wood board, a wooden table under the marble), and each photograph's
  own blur is measured on its square boundaries and taken back off
  (`focus.py`), as far as the pixel grid allows and no further. The first step
  is what makes the squares sharp, and the one place a model is allowed near
  them: a square is 50 to 230 px across in the photographs where a texture
  wants 256, so each photograph is enlarged four times by Stability's fast
  upscaler on Bedrock, which draws plausible grain of about the right density
  rather than recovering the board's own: a square's shape, shade, color and
  figure are the real board's, measured off the photographs, and its finest
  grain is the model's. Nothing else sharpens them: super-resolution of the
  2021 kind read a wood's figure as noise and smoothed it away, and
  deconvolving past what `focus.py` measures turns grain into gravel. Only for
  photographs the project holds the rights to — nothing of another chess
  site's, ever (see the product rules), and the extension ships no license for
  these ten: they are the project's own photographs of its own boards, so
  there is nothing to license. Read what it prints: how many squares each
  photograph gave, how many pixels across they are against the 256 a texture
  wants, and the lightness spread inside a square and between squares, which a
  real board puts at 1 to 5 and 1 to 3. **With no real board**: a material in
  `materials.py`, drawn from seeded noise, then `generate.py`. Either way the
  relief holds each channel, not just lightness, so a square carries its own
  color and not only its own shade of the next one's.
- _An icon:_ an interface icon (a button's, a control's, a menu's, a
  field's) is one of Hugeicons' free icons (`@hugeicons/core-free-icons`,
  MIT, stroke rounded), never one drawn by hand. In TS, import it on its
  own (`import Search01Icon from '@hugeicons/core-free-icons/Search01Icon'`)
  and draw it with `hugeicon()` (`#shared/hugeicons.ts`). In CSS, name
  `img/hugeicons/<name>.svg` (`Search01Icon` is `search-01`) as a mask over
  `currentColor`, or, where no mask can go (an input's background), as an
  image with its color in its name (`search-01--989795.svg`); then run
  `pnpm icons`, which writes the files the CSS names. Lichess's interface
  glyphs are mapped once, for every `[data-icon]`, in
  `styles/theme/hugeicons/`; a glyph our CSS draws keeps its box,
  see-through, with the icon painted in it (as there). The time controls',
  the variants' and Lichess's own marks (logo, Storm, Berserk, studies) stay
  its glyphs. The time controls' are in `[data-icon]::before` (`\e059`
  ultrabullet, `\e032` bullet, `\e008` blitz, `\e002` rapid, `\e00a`
  classical, `\e019` correspondence), colored per mode in
  `styles/theme/game-modes.css`: set `--ln-ext-mode-color` on the
  `::before` to recolor one. Elsewhere, draw one with
  `content: var(--ln-ext-mode-rapid)` (or another mode) in
  `font-family: lichess`, in `var(--ln-ext-mode-rapid-color)` (every mode
  but ultrabullet has one).
- _No emoji:_ emoji don't look clean. A colored icon is a Hugeicon in a color
  of the palette on a tile tinted with it (a side menu's link sets
  `--ln-ext-nav-glyph` and `--ln-ext-nav-color`,
  `styles/pages/headings-menus.css`), never an emoji file nor one of Lichess's
  flair images (the players' own flairs aside, theirs to pick).
- _Icons as you go:_ don't wait to be asked. On a page you work on, a
  Lichess glyph that has no Hugeicon yet, or an icon drawn by hand in our
  code, gets its Hugeicons counterpart in the same change (a line in
  `styles/theme/hugeicons/`, or `hugeicon()`), checked on the page.

## Product rules

The goal is a **modern Lichess, as easy to use as the big commercial chess
apps**: someone coming from one finds their way at once. When in doubt,
match how those apps work, never what they made (below). Lichess keeps its
features and its name: free analysis, open data, no ads.

- **Nothing of another site's:** match how the commercial apps work and
  feel, never copy what they made. No image, icon, piece set, board, sound,
  logo, illustration or text of another chess site goes in the extension,
  not even redrawn or traced: an earlier version was taken off the Chrome
  Web Store for that. Draw our own, use Lichess's, or files under a free
  license, with that license in `public/licenses/`.
- **The look:** dark or light as Lichess's own Theme says, in the color theme
  the user picked for each, our blue board (or Lichess's, or a pack's), bold
  gradient buttons, a fixed left sidebar, roomy player bars with avatars and
  clocks.
- **The layout:** board on the left, one right-hand panel (moves, controls,
  chat), and a page that never scrolls: everything fits the viewport, like a
  native app. Add nothing below the board. The panel's parts share one area
  under a tab bar of its own (Coups, the chat's tabs, or the game info where a
  game has no chat: `content/layout/panel-tabs.ts`), on the game page and the
  analysis pages alike, so none of them takes a height of its own.
- **The feel:** a pack's sounds if the user has one, the players' intro at the
  start (picked in the settings), the kings' badges, the winner's confetti and
  the coach's card at the end, and a Game Review ("Bilan") with an eval graph,
  accuracy, move classes, the coach's card, board badges and an eval bar.
- **The coach talks in a card:** wherever the coach speaks (the review, a
  Learn stage…), it's the Game Review's coach card (`styles/review/bubble.css`,
  "The coach's card"): the coach standing on the card's bottom edge, its
  words to its right on the card itself. Never a speech bubble beside it.
  The coach is never cut at its sides: the card cuts it only at its feet
  and over its hops. Leave room for the arms its canvas reaches past its
  avatar's box, the fox's the farthest: about a fifth of the coach's height
  before it (24px for the review's 114px coach, 40px for the puzzles' 140px)
  and before the words. Check every coach (`ln-ext-coach` 1 to 26 in
  localStorage), a few frames apart, with the card's clip taken off.
- **CSS first**, JS only for what CSS can't do (sounds, measuring, captured
  pieces, the review).
- **Every asset is bundled**: no host permission, nothing loaded from
  another site at run time (Lichess's own assets aside). A pack is
  downloaded from GitHub once, when the user imports it, then kept in the
  browser. The one page from elsewhere is the rating study's, framed when the
  user unfolds it on the settings' Experimental page
  (`public/pages/rating-study.html`).
- **Use Lichess's own capabilities** (its Stockfish build, its analysis
  controller) rather than reinventing them.
- **Every language:** Lichess localizes text and some URLs (`/fr/training`).
  Never match on text or exact hrefs: match on structure, classes, or how an
  href ends (`a[href$='/training']`).
- **Every screen, not just the desktop:** tablets (about 768 to 1019px,
  portrait and landscape) and phones (about 390px) are as much a target as
  the desktop, whose layout starts at 1020px. A new or changed design comes
  with its tablet and phone versions, built in the same change: the user
  trusts the agent's design there, so no mockup waits on their approval,
  and they judge them in the draft like the rest. The build covers all
  three (a page that never scrolls on a desktop may scroll on a phone, but
  nothing overflows sideways). Leave no page half-done below 1020px. The
  game page shows how: its parts' look applies at every width, and only its
  grid changes, a column that scrolls below 1020px
  (`styles/game/layout-narrow.css`, and so do `styles/analysis` and
  `styles/review`).
- **Playful pages:** a color per section, icons on gradient tiles, cards,
  pills, illustrations (pieces in the board's set, our sidebar's drawings,
  little boards), never emoji (see "No emoji").
  Practice, simuls and the forum set the tone. Every side menu (`.subnav`)
  gets an icon per link on a tile in its own color: add the menu to the
  shared rule in `styles/pages/headings-menus.css`, then set
  `--ln-ext-nav-glyph` (a Hugeicon) and `--ln-ext-nav-color` per link. Every
  item of a side menu, a link to a page, has its icon: the Hugeicon that
  page already has elsewhere if it has one (another menu's link, its
  title's), else the closest one Hugeicons has.
- **One picture per page:** a page the sidebar lists is drawn with its sidebar
  picture (`img/sidebar/<page>.webp`, as `styles/sidebar/nav.css` names them)
  wherever it stands for that page: its title, the profile's activity and
  rating cards, a button that leads there. Never an emoji or a Lichess glyph
  in its place. Side menus are the exception: their links are all Hugeicons,
  alike (see "Playful pages"), and a page with a side menu starts its title
  with its open link's tile, the same icon (`styles/pages/menu-titles.css`:
  give a new menu's link a
  `main.page-menu[data-ln-ext-menu~=…][data-ln-ext-nav-active$=…]` selector
  too).
- **Cards stay plain:** never fill a card's background with green or red;
  color a badge, a tile or the title instead (buttons aside).
- **Dark on the bright hues:** never white text or a white icon on a
  bright hue of the palette (green, yellow, cyan, orange, pink): it can't be
  read. Write it in `--ln-ext-ink` (a Hugeicon as a file:
  `tick-02--0c0c0d.svg`), or put the hue on the icon over a tile tinted with
  it instead.
- **Hover feels the same everywhere:** a card lifts and its icon tile hops,
  `rotate(-6deg) scale(1.08)` on cards, `translateY(-2px) rotate(-8deg)
  scale(1.08)` on menu links, both
  `transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)`.
- **Tabs slide:** a tab bar's highlight is one piece that slides to the tab
  picked (`0.35s cubic-bezier(0.22, 1, 0.36, 1)`). Register the bar in
  `TAB_BARS`; its CSS gives the piece the active tab's look (`--ln-ext-tab-bg`,
  `-shadow`, `-radius`, `-line`) and takes that look off the active tab
  under `[data-ln-ext-tabs]` (`styles/theme/tooltips-and-tabs.css`).
- **Motion is never reduced:** never write a `prefers-reduced-motion` query
  (see "Lichess reduces motion").
- **Only the content scrolls:** a page's side panel and title stay put while
  its content scrolls (`position: sticky`, as in `styles/simul`, or a
  scrolling content area). A side menu or column never scrolls with the
  content: it stays put, and if it's taller than the window it scrolls on
  its own (`max-height` and `overflow-y: auto`, from the window's edge, see
  "The top room"). Every page that scrolls has its title pinned at
  the top (see "The top room" under the pitfalls), with an icon on the
  title's left. Look for the page's icon before drawing one: first the main
  sidebar's picture for it, then the icon of another link that leads there
  (a side menu, a card, a button); pick a new one only if none exists, and
  then use it on those links too (see "One picture per page").
- **Every chart is modern:** Lichess's Chart.js canvases are redrawn in SVG
  from the page's data (`content/charts/rating-chart`,
  `page/charts/distribution`, `content/charts/radar`, `page/charts/game`
  for a game's advantage and move times, `page/charts/insights` for the
  insights page's answer and the player's own average over it): smooth curves or
  rounded columns over a gradient in the series' color (the same color for
  the same rating everywhere), a faint dashed grid, chips as the legend, a
  frosted tooltip, an entrance animation, labels from `i18n.site`, numbers
  from `Intl`. Hide Lichess's canvas only once ours is in.

## Lichess pitfalls

Learned the hard way. Check here before touching the area concerned. Those
that hold for one area only are in an `AGENTS.md` beside its code, which
Claude Code loads as it reads there; any other agent reads the one of the
area it works on first:

- `src/page/`: Lichess's page APIs, the free analysis board, chessground's
  shapes, a game's charts.
- `src/page/review/`: the cloud eval, mate distances, the engine's spread.
- `src/styles/game/`: the move list's obfuscated tags, game over, variants,
  Zen mode, TV.
- `src/styles/analysis/`: practice lessons, broadcasts.
- `src/styles/sidebar/`: the scroll state, the header below 1020px.
- `src/content/coach/`: the coach's mascots.
- `src/content/packs/`: Lichess's piece variables.
- `src/content/pages/`: the home's quick pairing and blog carousel,
  tournament podiums.
- `src/content/ui/`: hover cards, tab bars redrawn on click.
- `src/content/player-card/`: what Lichess's API says about a hovered player.
- `src/content/profile/`: profiles.

A new pitfall of one area goes in its file (a new one gets a `CLAUDE.md`
link to it, and a line here). The rest hold everywhere:

- **Coordinates.** Lichess swaps `body.coords-out` for `coords-in` while its
  eval gauge shows (`forceInnerCoords`). On desktop
  `styles/board/coordinates.css` draws both outside, sized by
  `--ln-ext-coords-size`; a layout leaves them room under
  `body:is(.coords-in, .coords-out)` (a gutter for the ranks,
  `--ln-ext-coords-off` for the files). Below 1020px both are drawn inside:
  Lichess's outside ones ran past a board as wide as the screen.
- **Board inset.** Chessground shrinks the board to whole pixels per square,
  so `cg-container` sits a few px inside its wrapper:
  `content/layout/board-inset.ts` measures it into `--ln-ext-inset-{t,r,b,l}`.
  Align anything with the squares through those.
- **Definite grid rows.** The right panel's rows need known heights: the
  controls' is measured into `--ln-ext-controls-h`, and on the game page the
  voice bar's, the crosstable's and the keyboard-move input's, which stand over
  the panel's part on show, into `--ln-ext-voice-h`, `--ln-ext-crosstable-h`
  and `--ln-ext-keyboard-h` (their room at the bottom adds up in
  `--ln-ext-panel-bottom`). What grows must be one of these overlays, never a
  row the board spans: the game page's controls carry a card at a game's end,
  which would otherwise push the board off the screen. Lichess sets an inline
  `height` on the analysis chat: override it.
- **CSP.** Images load from anywhere; audio and `fetch` only from Lichess's
  domains, `blob:` and `data:`, not even the extension's files. So
  `content/packs` reads a pack's sounds and `page/sounds` plays them as
  `blob:` URLs. Firefox holds a content script's `fetch` to the page's CSP
  too, so packs are downloaded by the background worker
  (`background/packs.ts`): GitHub's files allow any origin, so it needs no
  host permission. Other cross-origin data would need one.
- **Thin fonts.** Lichess sets weight 300 on Roboto / Noto Sans.
  `content/bootstrap/fonts.ts` appends `@font-face` rules pointing them (and
  `LN Ext Sans`) at the system font; they must come after Lichess's, hence not
  in the manifest CSS.
- **Two worlds.** `src/content` can't see page objects (`site`,
  chessground's `cgKey` expandos); `src/page` can, but can't call
  `chrome.runtime.getURL`. They talk through the messages of
  `src/shared/protocol.ts`. To show a bundled image from the page world,
  list it in `web_accessible_resources` and load it from CSS with
  `url('chrome-extension://__MSG_@@extension_id__/<path>')`, or read the
  base URL the content script puts in `data-ln-ext-assets` on `<html>`.
- **Buttons.** A gradient with a 1px top highlight, a 1px darker bottom edge
  and a soft shadow, not a 3D ledge: use
  `--ln-ext-btn-{primary,grey,red}[-hover|-shadow]` (`styles/theme/base.css`).
  Where Lichess glues a button to an input or stacks buttons flush, drop the
  shadow or add a gap.
- **Firefox.** Its own build (`pnpm build --target firefox`) from the same
  sources. The CSS names bundled files as
  `chrome-extension://__MSG_@@extension_id__/…`, which the build rewrites:
  never build an extension URL another way. Firefox ignores
  `::-webkit-scrollbar`, and `scrollbar-color` would disable those rules in
  Chrome, so it's set for Firefox only (`@supports (-moz-appearance: none)`).
  Firefox injects the content scripts into open tabs on install or update,
  where an older copy's page script still runs:
  `content/bootstrap/late-reload.ts` reloads such a tab.
- **Game URLs.** Every game page sits under `/game/`: `/game/<id>` for a
  watcher, the side it's seen from after it (`/game/<id>/black`, or
  `?pov=<user>`), and `/game/<fullId>` for a player, whose id carries four
  more letters. Lichess redirects the older `/<id>/<color>`, so no page stays
  there. Tell a game's page from its path through `#shared/game-path.ts`,
  never by an id at the path's root.
- **`#page-init-data`.** A page's module data is inlined there as JSON (the
  rating stats page also passes its chart data in
  `loadEsm('chart.ratingHistory', …)`), and Lichess removes the element once
  read. Capture the node while the page parses (`#shared/page-init-data.ts`);
  its text stays readable after removal.
- **A transparent box still clips.** Lichess's `.box` (and `.lobby__side`…)
  have `overflow: hidden`: once transparent, the clip still cuts hover
  shadows and focus rings, and it traps `position: sticky`. Add
  `overflow: visible !important`, then check that a closed `.mselect__list`
  doesn't widen the page (anchor it with `inset-inline: auto 0`).
- **A page that must not scroll.** Lichess's hidden hover cards leave ~40px
  to scroll at the document's end, so a layout that fits still needs
  `html, body { overflow: hidden }` (as `styles/game` and
  `styles/swiss-show` do), each column scrolling in place. A sticky title
  can't leave its parent: to pin it over more, make the parent
  `display: contents`.
- **Boards sized to the window.** Lichess sizes some boards from the whole
  window's width, as if there were no sidebar (Storm, Racer, coordinates,
  Learn, puzzles): cap the board's column by what the sidebar leaves
  (`100vw - var(--ln-ext-sidebar-w)`, margins, side panel) and keep the ranks'
  gutter.
- **The board's resize handle.** `cg-resize` sets `---zoom` (0–100) on
  `body`, which Lichess turns into `---board-scale` and saves as a pref that
  may predate our layout. Ours ignores it: the board takes all its room
  until dragged, and `content/layout/board-zoom.ts` keeps the dragged size
  (`ln-ext-board-zoom`, `--ln-ext-zoom`). A layout that sizes its own board
  multiplies by `var(--ln-ext-board-scale, 1)`. Use `dvh`, not `vh`: on phones
  and headsets `100vh` is taller than the view.
- **Pinned titles.** Don't widen a sticky title with negative margins (it
  overflows at 1024px): use side box-shadows in the page's color.
- **The top room.** On desktop `#main-wrap` is what scrolls, and its 16px
  top room (`--ln-ext-page-top`, `styles/sidebar/layout.css`) is padding, so the
  content scrolls up to the window's edge. Never make it a border again: the
  content would be cut 16px short of the top. But sticky things stick below a
  scroller's padding (`top: 0` is 16px down), and what scrolls shows in the
  strip above them:
  - a pinned title puts `var(--ln-ext-pin-cover)` first in its `box-shadow`
    (`--ln-ext-pin-cover-wide` when 12px side shadows widen it): the page's
    color over the strip. It also covers the 16px above the title when not
    stuck, so keep that room empty;
  - a column that scrolls in place starts at the window's edge, its content
    where it was: `top` and `margin-top` at minus the room, twice the room
    as `padding-top` (`.tour-home__side`, `styles/pages/tournaments.css`).
    Otherwise its content is cut at its own top, 32px down;
  - side menus and cards that don't scroll stay at `top: 16px`.
- **The page's background.** Lichess draws some things behind the page with
  a negative z-index (clock faces): paint the page's color on `html`, never
  on `body` (`styles/theme/base.css`).
- **Lichess reduces motion.** Under `prefers-reduced-motion: reduce` its CSS
  kills every transition and animation (ours too), its header stops being
  sticky, and its scripts ask `matchMedia`. `page/motion` answers `reduce`
  as false and `no-preference` as true, and, as a script can't edit a
  cross-origin sheet, reloads each Lichess sheet with CORS, rewrites its
  reduced-motion rules and disables the original. Until the copy loads,
  Lichess's rule applies: keep our `transition`s `!important`.
- **Lichess's light theme.** We follow Lichess's scheme: `html.light` is light
  (its Theme menu sets it, or the device for `system`, also on anonymous
  visitors and headless Chrome), anything else dark. Lichess rewrites
  `<html>`'s class when it changes: key on it, never add a class there (the
  review's, older, are put back on each of its passes,
  `page/review/view/render.ts`). Its own `.light …` rules still apply here and
  there: check both. A Hugeicon file in a pastel color vanishes on a light
  tile: draw the glyph as a mask in its hue, as `styles/pages/menu-titles.css`
  does.
- **800px exactly.** Lichess's phone menu applies up to `max-width: 800px`:
  start desktop rules at `800.02px`, not `800px`.
- **Side menus below 1020px.** From 800px a `.subnav` stays a column beside
  the page; below, it's a strip over it, whose `.subnav__inner` scrolls (or
  the menu itself, when it has no inner one). `styles/pages/menu-narrow.css`
  keeps the column put and fades the strip's edges; a page's content box
  gets 8px margins there, so a page rule that pads it must too.
- **Boards on their side.** Lichess's puzzles, Storm, Racer, Learn and the
  coordinate trainer take two columns from 799.3px or in any landscape
  window, phones included: below 1020px our layouts go one column upright
  and two under `(orientation: landscape)` (`styles/puzzle/layout-narrow.css`).
  Size the rows a spanning board covers, or one of them grows to its height.
- **A page column as wide as its content.** From 800px an arena's, a Swiss's
  and a simul's page set `---main-max-width: auto` on `#main-wrap`, whose page
  column then sizes to its content between two free ones: a short Swiss stood
  in the middle. A narrow layout sets it to `100%` behind its
  `data-ln-ext-has` flag (`styles/events-narrow/layout.css`); a width on
  `main` can't help, the track takes it as its minimum and overflows.
- **Picker names.** lila puts a picker's name in its `mselect`'s id
  (`#…__day-select`), not its class.
- **`:has()` slows the board.** Chrome re-checks a `:has()` whenever an
  element is added or removed under its anchor, restyling all the rule
  could style: on a board, every move. Every stylesheet loads on every page,
  so everywhere:
  - no `:has()` on `html`, `body`, `#main-wrap` or `main`: read a word of
    `data-ln-ext-has` on `<html>` instead (`html[data-ln-ext-has~='round']`),
    kept by `FLAGS` in `content/layout/has-flags.ts`;
  - no attribute selector, `:not()` or `*` inside a `:has()`: have `MARKS`
    (`content/layout/marks.ts`) copy what a rule needs onto the element
    (`data-ln-ext-nav`, `data-ln-ext-icon`, `data-ln-ext-href`…);
  - nothing inside a `:has()` that Lichess adds during a game (`piece`,
    `square`, `div`, `button`, `a`, the move list's tags), and no bare tag
    or `*` after one (`.x:has(.y) div` restyles every `div`);
  - no endless `requestAnimationFrame` or animation loop, and
    `classList.toggle(name, true)` rather than `add` on `<html>`.

  Check with DevTools' Performance panel over a few moves: a "Recalculate
  style" should touch ~15 elements, not hundreds.

## Testing on lichess.org

- **The suites don't run on the user's machine**: never `pnpm test:e2e`,
  `test:e2e:fast` nor `test:firefox`, which open browser after browser across
  their specs and leave the machine swapping. CI runs them when the user
  starts it. A one-off check of your own is what the rest of this section is
  for: one browser at a time, closed as soon as you're done.
- The end-to-end tests (`tests/e2e`) and any one-off check use Playwright's
  Chromium with `dist/chrome` loaded (`tests/e2e/fixtures.ts`). Branded
  Chrome ignores `--load-extension`; Playwright's default headless shell
  drops extensions silently, hence `channel: 'chromium'`. Use a desktop
  user agent, or Lichess serves its mobile layout.
- Check the extension is in before trusting a screenshot: read a computed
  style one of our rules sets (on an analysis page, `.analyse__controls` has
  a 1px `border-top`).
- A finished game's analysis opens on the review's summary, which hides the
  move list: click "Start Review", or `.ln-ext-review__close` for Lichess's
  panel.
- Wait for elements, not for time: snabbdom draws after `load`. Scroll
  panels yourself (`.analyse__moves`' `scrollTop`) and screenshot with a
  `clip` on the element's `boundingBox()`.
- Viewports: 1024×768 (also a landscape tablet), 1366×640, 1600×900,
  1920×1080 and 2560×1440, both sides of each breakpoint the page's CSS uses
  (1019 / 1020, 1259 / 1260, 800 / 801), the portrait tablets 768×1024 and
  820×1180, and the phones 390×844 and 360×800. Nothing overflows, the page
  doesn't scroll, bars and the eval bar line up with the board.
  A page that scrolls: scroll it, and see its title stay pinned at the top
  and its side menu stay put (see "Only the content scrolls").
- Headless Chrome reports `prefers-reduced-motion: reduce` (like the user's
  own Chrome) and a light color scheme: check animations under `reduce`
  (sample frames with `requestAnimationFrame`, in the page), and emulate
  `dark` too. Playwright hides scrollbars in headless mode
  (`ignoreDefaultArgs: ['--hide-scrollbars']` brings them back).
  Its phone emulation answers `hover: hover` where a phone answers `none`:
  a hover a tap would leave stuck goes under `@media (hover: hover)`.
- Signed in: `pnpm lichess:login` opens Playwright's Chromium on Lichess's
  sign-in page as a plain browser (its bot check fails one Playwright drives)
  for the user to sign in and close; `--cookie <lila2>` takes a signed-in
  browser's session cookie instead, `--check` says who's in. The profile is
  kept outside the repo (`tests/e2e/support/session.ts`), and a one-off check
  opens it with `launchSignedIn()`, one browser at a time. Never sign in for
  the user, and never put a session or a password in the repo; CI's tests stay
  signed out.
- Pages that need an account and that the kept session can't reach (the
  puzzle dashboard of another account) can't be driven live:
  rebuild them locally from a public page's shell, the markup of lila's
  Scala template and Lichess's own stylesheet for the page
  (`assets/css/<key>.<hash>.css`), without the shell's CSP `<meta>`, and
  measure in numbers.
- Firefox: Puppeteer loads `dist/firefox` over WebDriver BiDi
  (puppeteer-core's `launch({ browser: 'firefox' })`, then
  `browser.installExtension(path)`); the dev auto-reload drops its session.

## Shipping

When the user has validated the draft and the work is done (see
[Definition of done](#definition-of-done)), ship it without being asked.
Don't open a PR.

1. Take your turn, after the other sessions (see
   [Before shipping](#sessions-side-by-side)). Then commit with a short message in English (a one-line summary under ~70
   characters, in the imperative: "Fix the eval bar on flipped boards"; a
   body only when the why isn't obvious), without a `Co-Authored-By`
   trailer. Rebase onto `origin/main` (`git fetch origin &&
   git rebase origin/main`, never a merge: `main` stays a straight line) and
   push as a fast-forward (`git push origin HEAD:main`). If `main` moved,
   fetch, rebase and push again. If the rebase brought in changes to the
   files you touched, run `pnpm check` again first.
2. In the main checkout, `git pull --ff-only`, then
   `pnpm install --frozen-lockfile && pnpm preview`: Chrome loads its
   `dist/chrome`, and reloads itself when a Lichess tab next gets focus. If
   `pnpm preview` names another session's draft, leave it on show, as the
   user is judging it, and say so in your summary. Then
   `pnpm turn release ship`, and tell the next session in line.
3. Remove any throwaway files you created.
4. Don't bump the version: CI stamps `<BASE_VERSION>.<patch>` into each
   release and publishes it as `v<version>`, the patch counting the commits
   since `BASE_VERSION` (`src/manifest.ts`) last changed. Raise `BASE_VERSION`
   only for a big change: that commit is `.0`, the next ones `.1`, `.2`…
5. Finish with a short summary of what was done.

A push to `main` makes no release: `/ci` (or the Release workflow, run by
hand on `main`) runs the CI, then makes a GitHub release with its zips, but
doesn't reach the stores. Start it only when the user asks. A version goes
to the stores only when the user asks too, with `/ci-publish`
(`.claude/skills/ci-publish`): it checks that the Chrome Web Store has no
version in review (the Store status workflow), tags `main` `store-<version>`,
and follows the run: the release workflow sends that commit to the Chrome Web
Store and Firefox Add-ons, each live once reviewed. The listings are edited by hand (`store/listing.md`).
