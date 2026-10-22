# The game page

Lichess's pitfalls on the game page (`styles/game`, `content/game`,
`page/game-over`), learned the hard way. The rules for the whole repo are in
the root's [AGENTS.md](../../../AGENTS.md).

- **Obfuscated tags.** The game move list's tag names change between Lichess
  releases (now `i5d`, `aPp`, `qZM`, `Z7yx`, `bo3`, active class `a1t`):
  `styles/game/move-list.css` lists old and new ones in `:is()`. If the move
  list loses its style, find the new names in Lichess's round bundle.
- **Game over.** The end-of-game buttons are `.rcontrols > .follow-up`
  (rematch, new opponent, tournament, then the analysis link, always last).
  "New opponent" exists only for lobby and pool games; otherwise
  `content/game/new-game.ts` prepends its own `/?hook_like=<id>` button.
  `page/game-over` puts its card at the head of these buttons, which are its
  foot (the analysis link first, as Game Review). The round data has no clock
  history: move times come from `/game/export/<id>?clocks=true`, and every
  position of a game just over from its finished page (`/game/<id>`,
  `cfg.data.treeParts`), with its status and winner, which `page/game-over`
  reads rather than the page's words; its `treeParts` are the analysis page's
  mainline, start included, so the game page fills the review's cache under
  the key that page reads. Game pages are cross-origin isolated like analysis
  pages, so Lichess's Stockfish runs there too, but never before the game is
  over (Lichess's fair play rules). Lichess marks the kings with its own
  badges (`.cg-custom-svgs`), which ours replace. At a game's end Lichess
  leaves an empty `.crosstable` before the new one: it's hidden, and the
  filled one measured. In a scrolling grid, a track like `minmax(30px, auto)`
  never grows past its minimum: put the minimum on the items.
- **Variants.** Crazyhouse's pockets are grid areas `mat-top` / `mat-bot`
  that the game grid must place (`styles/game`). Three-check's checks are
  kings in `.material`, which our bars hide: `content/game/captured.ts`
  shows them. Racing Kings and Horde start with other pieces.
- **Zen mode** (`body.zenable.zen`) hides all but the board, clocks and
  controls; our `!important` layout rules must yield to it (`styles/game`).
- **TV.** `/tv` and `/tv/<channel>` don't carry the game's id: take it from
  the move list's analysis link.
