# Analysis pages

Lichess's pitfalls on the pages built on `main.analyse` (`styles/analysis`,
`styles/practice-run`, `styles/broadcast`), learned the hard way. The rules
for the whole repo are in the root's [AGENTS.md](../../../AGENTS.md).

- **Practice lessons are analysis pages.** `/practice/…` is `main.analyse`
  with `.practice__side` and either `.gamebook` (a lesson) or
  `.practice-box` (a drill). "Practice with computer" adds `.practice-box`
  to any analysis board, so scope on `.practice__side`. A drill's goal sits
  in `.analyse__underboard`, which our layout hides. Panel rows need a
  definite height: `1fr` in a content-sized container just grows.
- **A `main.analyse` without a board.** A broadcast's page is
  `main.analyse.is-relay.has-relay-tour`: the analysis layout must leave it
  alone (`styles/broadcast/tour`). It carries the `analyse` flag, whose
  rules keep `#main-wrap` from scrolling and outline a panel it doesn't have:
  undo them there, or exclude it.
- **A broadcast's pickers.** Lichess unsets the round and tour pickers'
  `position`, so their menu hangs from both pickers' box; and the round's
  puts its click-away mask in `<body>`, over `#main-wrap`, whose stacking
  holds the menu: it hid the menu, then caught its clicks.
  `dropdowns/mselect.css` keeps it see-through, and while it points at an
  open menu (`menu-mask`) takes `#main-wrap`'s isolation off and lifts a
  pinned title holding the menu (the studies' and coaches' lists use it too).
- **A broadcast's side sticks inside `main`.** The games and chat are a
  sticky column: room at the page's end must be the tour's padding, not
  `main`'s, or it pushes the column up as the page reaches its end.
