# The page world

Lichess's pitfalls in the page world, for its objects and what they hold,
learned the hard way. The rules for the whole repo are in the root's
[AGENTS.md](../../AGENTS.md).

- **Page APIs.** `site.sound` is the sound player, which Lichess calls on a
  step forward only, but every jump calls its `saySan(san, true)`:
  `page/sounds/jumps.ts` sounds the others from there. `site.analysis` is the
  analysis controller (`mainline`, `node`, `path`, `nodeList`,
  `tree.nodeAtPath`, `jumpToMain`, which doesn't scroll the move list,
  `getOrientation`), with the arrows in `chessground.state.drawable`; the
  engine is `npm/stockfish-web/sf_19_smallnet.js`, or its `_relaxed-simd.js`
  build where the browser runs relaxed SIMD, as Lichess picks it
  (`page/review/engine/relaxed-simd.ts`). Only analysis pages have
  a controller: code that must also work on game pages reads the board's
  DOM (`page/board` does).
- **A game's charts.** Lichess fills `#acpl-chart-container` and
  `#movetimes-chart-container`, in the underboard's panels, when their tab is
  first picked. Their data: each mainline node's `eval` (the server
  analysis, White's view, filled in as it runs) and `clock` (centiseconds),
  and `data.game.moveCentis` and `division` (the phases' plies).
- **The free analysis board.** `/analysis` is `main.analyse` with
  `site.analysis.synthetic` set: no game to export, a tree that grows as the
  user plays. Each `move` in its list carries its tree path in `p`. Opening
  names come from `explorer.fetchMasterOpening(fen)`, a 401 when signed out.
- **Chessground's shapes.** `cg-container > svg.cg-shapes`, one `g` per
  shape (a circle for a marked square, a line for an arrow), in square units
  from the viewBox corner (`-4 -4 8 8`), orientation already applied. Arrow
  ends are pulled in from the centers: round back. The group's `cgHash` is
  `width,height,hilite,orig,dest,brush…`; `hilite` marks the shape being
  dragged. Engine arrows use a pale brush, so their `opacity` is below 1.
