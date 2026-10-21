# The Game Review

Lichess's pitfalls for the Game Review's engine and judge, learned the hard
way. The review's design is in [README.md](README.md). The rules for the
whole repo are in the root's [AGENTS.md](../../../AGENTS.md).

- **The cloud eval.** `/api/cloud-eval?fen=…&multiPv=2`: no account, one
  position per request, one request at a time; a 404 means nobody analyzed
  it (in a game: out of the opening). Scores are White's view, castling is
  king-takes-rook. The export's `evals=true` gives the server analysis when
  there is one: one line per position, no second best.
- **Mate distances.** Win probability can't grade a move between two mates,
  so the review reads mate distances, and our engine only gets short ones
  right (at depth 16, mate in 5 or fewer is exact; longer comes out longer).
  Trust a move's short side only (`SURE_MATE`, `page/review/judge/mate.ts`)
  and never print a long defense's length.
- **The engine is nondeterministic.** Two runs of a game differ on about
  one verdict in six, mostly by one step, the game rating by 100+ points:
  compare runs from the same `ln-ext-review:*` cache entry, which skips the
  engine, or against that spread.
