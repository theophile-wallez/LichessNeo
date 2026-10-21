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
  alone (`styles/broadcast`).
